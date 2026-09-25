import AVFoundation
import CoreGraphics
import Foundation
import Observation

/// A flag's capture, packaged on disk and ready for the outbox: the manifest plus one file per part.
nonisolated struct PackagedFlag: Sendable {
    let manifest: FlagCaptureManifest
    let directory: URL

    static func fileName(for kind: CapturePartKind) -> String { kind == .video ? "video.mp4" : "audio.m4a" }
    func file(for kind: CapturePartKind) -> URL { directory.appending(path: Self.fileName(for: kind)) }
}

/// The capture logic, with no UI. Any flow drives it the same way:
///
///     try await engine.start()                 // once: rolling screen buffer + window timeline
///     let id = try await engine.startFlag()    // the employee begins a flag: voice starts, buffer pinned
///     let flag = try await engine.finishFlag() // freeze: last 3 min of video, the voice note, the windows
///     try outbox.enqueue(flag)                 // or show a review first; nothing has left the Mac yet
///
/// `cancelFlag()` throws the flag away. Every timestamp comes from one `CaptureClock`.
@Observable
final class CaptureEngine {
    enum ScreenState: Equatable {
        case off, starting, recording, needsPermission
        case failed(String)
    }

    enum Failure: Error, LocalizedError {
        case microphoneDenied, flagInProgress, noFlag, screenNotRecording, noVideo
        var errorDescription: String? {
            switch self {
            case .screenNotRecording: "Friction needs Screen Recording to flag. Allow it in System Settings, Privacy and Security, Screen and System Audio Recording, then quit and reopen Friction."
            case .noVideo: "The screen recording wasn't ready, so nothing was sent. Try again in a few seconds."
            case .microphoneDenied: "Friction needs the microphone to record a flag. Allow it in System Settings, Privacy and Security, Microphone."
            case .flagInProgress: "A flag is already being recorded."
            case .noFlag: "No flag is being recorded."
            }
        }
    }

    struct ActiveFlag: Equatable {
        let id: UUID
        let clickedHost: Double
        let directory: URL
    }

    private(set) var screenState: ScreenState = .off
    private(set) var activeFlag: ActiveFlag?

    let clock = CaptureClock()
    @ObservationIgnored private let screen = ScreenBuffer()
    @ObservationIgnored private let windows: WindowTimeline
    @ObservationIgnored private var voice: VoiceRecorder?
    @ObservationIgnored private let staging = FileManager.default.temporaryDirectory.appending(path: "friction-capture")

    init() {
        windows = WindowTimeline(clock: clock)
        screen.onStop = { [weak self] error in
            Task { @MainActor in self?.screenStopped(error) }
        }
    }

    /// Starts the rolling screen buffer and the window timeline. Without Screen Recording permission,
    /// flags still carry voice; window titles need the same permission and come back empty without it.
    func start() async {
        windows.start()
        guard screenState != .recording, screenState != .starting else { return }
        guard CGPreflightScreenCaptureAccess() else {
            screenState = .needsPermission
            CGRequestScreenCaptureAccess()
            return
        }
        screenState = .starting
        do {
            try await screen.start()
            screenState = .recording
        } catch {
            screenState = .failed(error.localizedDescription)
        }
    }

    private func screenStopped(_ error: Error) {
        screenState = .failed(error.localizedDescription)
        Task {
            try? await Task.sleep(for: .seconds(2))
            await start()
        }
    }

    /// True between `startFlag()` being called and the voice note recording (the microphone prompt can take a while).
    private(set) var isStartingFlag = false

    @discardableResult
    func startFlag() async throws -> UUID {
        guard activeFlag == nil, !isStartingFlag else { throw Failure.flagInProgress }
        guard screenState == .recording else { throw Failure.screenNotRecording }
        isStartingFlag = true
        defer { isStartingFlag = false }
        guard await Self.microphoneAllowed() else { throw Failure.microphoneDenied }
        let id = UUID()
        let clicked = CaptureClock.now()
        let directory = staging.appending(path: id.uuidString.lowercased())
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        screen.pin(from: clicked - ScreenBuffer.retention)
        windows.pin(from: clock.wall(clicked - ScreenBuffer.retention))
        let voice = VoiceRecorder()
        try voice.start(writingTo: directory.appending(path: PackagedFlag.fileName(for: .audio)))
        self.voice = voice
        activeFlag = ActiveFlag(id: id, clickedHost: clicked, directory: directory)
        captureLog.info("flag \(id.uuidString, privacy: .public) started")
        return id
    }

    func finishFlag() async throws -> PackagedFlag {
        guard let flag = activeFlag, let voice else { throw Failure.noFlag }
        defer { reset() }
        let sent = CaptureClock.now()
        let recording = try voice.stop()
        // A flag always carries its screen recording: without video there is nothing to send.
        await screen.waitForCoverage(until: sent, timeout: ScreenBuffer.segmentSeconds + 1.5)
        guard screenState == .recording, let clip = screen.clip(from: flag.clickedHost - ScreenBuffer.retention, to: sent) else {
            try? FileManager.default.removeItem(at: flag.directory)
            throw Failure.noVideo
        }
        let raw = flag.directory.appending(path: "video-fragments.mp4")
        let video = flag.directory.appending(path: PackagedFlag.fileName(for: .video))
        try clip.data.write(to: raw)
        try await Self.remuxFromZero(raw, to: video)
        try? FileManager.default.removeItem(at: raw)
        let size = try FileManager.default.attributesOfItem(atPath: video.path)[.size] as? Int ?? 0
        var parts = [CapturePartSpec(kind: .video, contentType: "video/mp4", byteSize: size,
                                     startedAt: clock.wall(clip.start), endedAt: clock.wall(clip.end))]
        let windowsFrom = clock.wall(clip.start)

        let audioSize = try FileManager.default.attributesOfItem(atPath: recording.url.path)[.size] as? Int ?? 0
        parts.append(CapturePartSpec(kind: .audio, contentType: "audio/mp4", byteSize: audioSize,
                                     startedAt: clock.wall(recording.startHost), endedAt: clock.wall(recording.startHost + recording.duration)))

        let manifest = FlagCaptureManifest(
            flagId: flag.id,
            clickedAt: clock.wall(flag.clickedHost),
            sentAt: clock.wall(sent),
            parts: parts,
            screen: screen.settings,
            windows: windows.slice(from: windowsFrom, to: clock.wall(sent))
        )
        try JSONEncoder.contract.encode(manifest).write(to: flag.directory.appending(path: "manifest.json"))
        captureLog.info("flag \(flag.id.uuidString, privacy: .public) packaged: \(parts.map { "\($0.kind.rawValue) \($0.byteSize)B" }.joined(separator: ", "), privacy: .public)")
        return PackagedFlag(manifest: manifest, directory: flag.directory)
    }

    func cancelFlag() {
        guard let flag = activeFlag else { return }
        voice?.cancel()
        try? FileManager.default.removeItem(at: flag.directory)
        reset()
    }

    private func reset() {
        screen.unpin()
        windows.unpin()
        voice = nil
        activeFlag = nil
    }

    /// The buffer's fragments carry host-clock timestamps (hours in). A passthrough export of the video
    /// track's range rewrites them as a plain MP4 starting at zero, without re-encoding. The wall-clock
    /// start travels in the manifest's `startedAt`.
    private static func remuxFromZero(_ source: URL, to destination: URL) async throws {
        let asset = AVURLAsset(url: source)
        guard let track = try await asset.loadTracks(withMediaType: .video).first,
              let export = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough)
        else { throw CocoaError(.fileReadCorruptFile) }
        export.timeRange = try await track.load(.timeRange)
        try await export.export(to: destination, as: .mp4)
    }

    private static func microphoneAllowed() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: true
        case .notDetermined: await AVCaptureDevice.requestAccess(for: .audio)
        default: false
        }
    }
}
