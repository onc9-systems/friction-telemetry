import AVFoundation
import OSLog
import ScreenCaptureKit
import UniformTypeIdentifiers

nonisolated let captureLog = Logger(subsystem: "systems.onc9.friction", category: "capture")

/// The always-on rolling screen recording. ScreenCaptureKit delivers frames of the main display (Friction's
/// own windows excluded); AVAssetWriter encodes them as H.264 in fragmented-MP4 segments, which it hands
/// back in memory instead of writing a file; `SegmentRing` keeps the last `retention` seconds. Nothing here
/// touches the disk or the network: a clip leaves only through `clip(from:to:)`.
nonisolated final class ScreenBuffer: NSObject, SCStreamOutput, SCStreamDelegate, AVAssetWriterDelegate, @unchecked Sendable {
    /// 30 seconds for demos; the product spec is 3 minutes (180).
    static let retention: Double = 30
    static let framesPerSecond: Int32 = 5
    static let width = 1280
    static let segmentSeconds: Double = 2

    enum Failure: Error, LocalizedError {
        case noDisplay
        var errorDescription: String? { "No display to record." }
    }

    /// Called on the buffer's queue when the stream stops on its own (display change, permission revoked).
    var onStop: (@Sendable (Error) -> Void)?

    // Everything below is touched only on `queue`.
    private let queue = DispatchQueue(label: "systems.onc9.friction.screen", qos: .utility)
    private var stream: SCStream?
    private var writer: AVAssetWriter?
    private var input: AVAssetWriterInput?
    private var adaptor: AVAssetWriterInputPixelBufferAdaptor?
    private var lastPixelBuffer: CVPixelBuffer?
    private var lastPTS: CMTime = .invalid
    private var ring = SegmentRing(retention: ScreenBuffer.retention)
    private var pinnedFrom: Double?
    private var size = (width: ScreenBuffer.width, height: 800)
    private var heartbeat: DispatchSourceTimer?

    var settings: ScreenSettings {
        queue.sync { ScreenSettings(width: size.width, height: size.height, framesPerSecond: Double(Self.framesPerSecond)) }
    }

    func start() async throws {
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        guard let display = content.displays.first(where: { $0.displayID == CGMainDisplayID() }) ?? content.displays.first else { throw Failure.noDisplay }
        let own = content.applications.filter { $0.processID == ProcessInfo.processInfo.processIdentifier }
        let filter = SCContentFilter(display: display, excludingApplications: own, exceptingWindows: [])
        let height = Int((Double(display.height) / Double(display.width) * Double(Self.width) / 2).rounded()) * 2
        let config = SCStreamConfiguration()
        config.width = Self.width
        config.height = height
        config.minimumFrameInterval = CMTime(value: 1, timescale: Self.framesPerSecond)
        config.pixelFormat = kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
        config.showsCursor = true
        config.queueDepth = 6
        let stream = SCStream(filter: filter, configuration: config, delegate: self)
        try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: queue)
        queue.sync {
            self.size = (Self.width, height)
            self.resetWriter()
            self.stream = stream
        }
        try await stream.startCapture()
        queue.async { self.startHeartbeat() }
        captureLog.info("screen buffer started \(Self.width)x\(height) at \(Self.framesPerSecond) fps")
    }

    func stop() async {
        let stream: SCStream? = queue.sync {
            heartbeat?.cancel()
            heartbeat = nil
            defer { self.stream = nil; resetWriter() }
            return self.stream
        }
        try? await stream?.stopCapture()
    }

    /// Keep everything from `host` on until `unpin()`, however long the employee talks.
    func pin(from host: Double) { queue.async { self.pinnedFrom = host } }
    func unpin() { queue.async { self.pinnedFrom = nil } }

    /// Waits until the buffer holds video up to `host` (the writer closes a segment every ~2 s), or times out.
    func waitForCoverage(until host: Double, timeout: Double) async {
        let deadline = CaptureClock.now() + timeout
        while CaptureClock.now() < deadline {
            if let covered = queue.sync(execute: { ring.coveredUntil }), covered >= host { return }
            try? await Task.sleep(for: .milliseconds(200))
        }
    }

    /// A playable MP4 of `from..<to`: the initialization segment followed by the overlapping media
    /// segments, with the host-clock span it actually covers. Nil when the buffer holds nothing there.
    func clip(from: Double, to: Double) -> (data: Data, start: Double, end: Double)? {
        queue.sync {
            let segments = ring.clip(from: from, to: to)
            captureLog.info("clip \(from, privacy: .public)..\(to, privacy: .public): \(segments.count) of \(self.ring.segments.count) segments, ring \(self.ring.segments.first?.start ?? -1, privacy: .public)..\(self.ring.coveredUntil ?? -1, privacy: .public)")
            guard let head = ring.initialization, let first = segments.first, let last = segments.last else { return nil }
            var data = head
            for s in segments { data.append(s.data) }
            return (data, first.start, last.end)
        }
    }

    // MARK: Frames

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen, sampleBuffer.isValid,
              let attachments = CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
              let raw = attachments.first?[.status] as? Int,
              let status = SCFrameStatus(rawValue: raw)
        else { return }
        switch status {
        case .complete:
            guard let pixel = sampleBuffer.imageBuffer else { return }
            lastPixelBuffer = pixel
            append(pixel, at: sampleBuffer.presentationTimeStamp)
        case .idle:
            // The display did not change: repeat the last frame so segments keep closing on time.
            if let pixel = lastPixelBuffer { append(pixel, at: sampleBuffer.presentationTimeStamp) }
        default:
            return
        }
    }

    /// When no frames arrive at all (a static screen may stop idle frames too), repeat the last frame once a second.
    private func startHeartbeat() {
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + 1, repeating: 1)
        timer.setEventHandler { [weak self] in
            guard let self, let pixel = self.lastPixelBuffer, self.lastPTS.isValid else { return }
            let now = CaptureClock.now()
            if now - self.lastPTS.seconds > 0.9 { self.append(pixel, at: CMTime(seconds: now, preferredTimescale: 1_000_000_000)) }
        }
        timer.resume()
        heartbeat = timer
    }

    private func append(_ pixel: CVPixelBuffer, at pts: CMTime) {
        if writer == nil { makeWriter(startingAt: pts) }
        guard let writer, let input, let adaptor, input.isReadyForMoreMediaData else { return }
        if lastPTS.isValid, pts <= lastPTS { return }
        if adaptor.append(pixel, withPresentationTime: pts) {
            lastPTS = pts
        } else {
            captureLog.error("screen writer failed: \(String(describing: writer.error), privacy: .public)")
            resetWriter()
        }
    }

    private func makeWriter(startingAt start: CMTime) {
        let writer = AVAssetWriter(contentType: UTType(AVFileType.mp4.rawValue)!)
        writer.outputFileTypeProfile = .mpeg4AppleHLS
        writer.preferredOutputSegmentInterval = CMTime(seconds: Self.segmentSeconds, preferredTimescale: 600)
        writer.initialSegmentStartTime = start
        writer.delegate = self
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: size.width,
            AVVideoHeightKey: size.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 700_000,
                AVVideoMaxKeyFrameIntervalDurationKey: 1,
                AVVideoAllowFrameReorderingKey: false,
                AVVideoExpectedSourceFrameRateKey: Self.framesPerSecond,
            ] as [String: Any],
        ])
        input.expectsMediaDataInRealTime = true
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: nil)
        writer.add(input)
        guard writer.startWriting() else {
            captureLog.error("screen writer did not start: \(String(describing: writer.error), privacy: .public)")
            return
        }
        writer.startSession(atSourceTime: start)
        self.writer = writer
        self.input = input
        self.adaptor = adaptor
        lastPTS = .invalid
    }

    private func resetWriter() {
        if writer != nil { captureLog.info("screen writer reset; dropping \(self.ring.segments.count) segments") }
        input?.markAsFinished()
        writer?.cancelWriting()
        writer = nil
        input = nil
        adaptor = nil
        lastPTS = .invalid
        ring.reset()
    }

    // MARK: Segments

    func assetWriter(_ writer: AVAssetWriter, didOutputSegmentData segmentData: Data, segmentType: AVAssetSegmentType, segmentReport: AVAssetSegmentReport?) {
        let source = ObjectIdentifier(writer)
        let track = segmentReport?.trackReports.first
        let reported = track.map { ($0.earliestPresentationTimeStamp.seconds, $0.duration.seconds) }
        let apply = { [self] in
            guard let current = self.writer, ObjectIdentifier(current) == source else { return }
            switch segmentType {
            case .initialization:
                ring.initialization = segmentData
            case .separable:
                let start = reported?.0 ?? ring.coveredUntil ?? lastPTS.seconds
                let end = reported.map { $0.0 + $0.1 } ?? lastPTS.seconds
                ring.append(VideoSegment(start: start, end: end, data: segmentData), now: CaptureClock.now(), pinnedFrom: pinnedFrom)
            @unknown default:
                break
            }
        }
        if DispatchQueue.getSpecific(key: Self.queueKey) != nil { apply() } else { queue.async(execute: apply) }
    }

    private static let queueKey = DispatchSpecificKey<Void>()
    override init() {
        super.init()
        queue.setSpecific(key: Self.queueKey, value: ())
    }

    // MARK: Stream lifecycle

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        captureLog.error("screen stream stopped: \(error.localizedDescription, privacy: .public)")
        queue.async {
            self.heartbeat?.cancel()
            self.heartbeat = nil
            self.stream = nil
            self.resetWriter()
            self.onStop?(error)
        }
    }
}
