import AVFoundation

/// Records the voice note to an AAC file. The first buffer's host time is kept so the audio sits on the
/// capture clock: Deepgram's word offsets are added to it on the service.
nonisolated final class VoiceRecorder: @unchecked Sendable {
    struct Recording: Sendable {
        let url: URL
        /// Host-clock instant of the first recorded sample.
        let startHost: Double
        let duration: Double
    }

    enum Failure: Error, LocalizedError {
        case nothingRecorded
        var errorDescription: String? { "No audio reached the microphone." }
    }

    private let engine = AVAudioEngine()
    private let lock = NSLock()
    private var file: AVAudioFile?
    private var url: URL?
    private var firstHost: Double?
    private var frames: AVAudioFramePosition = 0
    private var sampleRate: Double = 48_000

    func start(writingTo url: URL) throws {
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        let file = try AVAudioFile(
            forWriting: url,
            settings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: format.sampleRate,
                AVNumberOfChannelsKey: format.channelCount,
            ],
            commonFormat: format.commonFormat,
            interleaved: format.isInterleaved
        )
        lock.withLock {
            self.file = file
            self.url = url
            self.firstHost = nil
            self.frames = 0
            self.sampleRate = format.sampleRate
        }
        input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, time in
            self?.receive(buffer, at: time)
        }
        engine.prepare()
        try engine.start()
    }

    private func receive(_ buffer: AVAudioPCMBuffer, at time: AVAudioTime) {
        lock.withLock {
            guard let file else { return }
            if firstHost == nil, time.isHostTimeValid { firstHost = AVAudioTime.seconds(forHostTime: time.hostTime) }
            do {
                try file.write(from: buffer)
                frames += AVAudioFramePosition(buffer.frameLength)
            } catch {
                captureLog.error("voice write failed: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    /// Stops and closes the file. Throws when not a single buffer arrived.
    func stop() throws -> Recording {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        return try lock.withLock {
            file?.close()
            file = nil
            guard let url, let firstHost, frames > 0 else { throw Failure.nothingRecorded }
            return Recording(url: url, startHost: firstHost, duration: Double(frames) / sampleRate)
        }
    }

    func cancel() {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        lock.withLock {
            file?.close()
            file = nil
            if let url { try? FileManager.default.removeItem(at: url) }
        }
    }
}
