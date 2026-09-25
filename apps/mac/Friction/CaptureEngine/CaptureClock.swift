import CoreMedia
import Foundation

/// The one clock every capture stream is stamped with. Screen frames (ScreenCaptureKit sample buffers),
/// audio buffers (AVAudioTime host time) and window samples all read the host clock; this anchor turns a
/// host instant into wall-clock UTC once, so every timestamp in a manifest shares one origin.
nonisolated struct CaptureClock: Sendable {
    let hostAnchor: Double
    let wallAnchor: Date

    init(hostAnchor: Double = CaptureClock.now(), wallAnchor: Date = Date()) {
        self.hostAnchor = hostAnchor
        self.wallAnchor = wallAnchor
    }

    /// Seconds on the host clock (mach absolute time), the timebase of CMSampleBuffer presentation times.
    static func now() -> Double { CMClockGetTime(CMClockGetHostTimeClock()).seconds }

    func wall(_ host: Double) -> Date { wallAnchor.addingTimeInterval(host - hostAnchor) }
    func host(_ wall: Date) -> Double { hostAnchor + wall.timeIntervalSince(wallAnchor) }
}
