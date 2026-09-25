import Foundation

/// The frontmost-window timeline: one event each time another app comes forward or the front window's
/// title changes. Keeps the last `retention` seconds plus the event in force at the start of that span.
nonisolated struct WindowLog: Sendable {
    let retention: TimeInterval
    private(set) var events: [WindowEvent] = []

    init(retention: TimeInterval) { self.retention = retention }

    /// Records a sample of the frontmost window. Returns false when nothing changed.
    @discardableResult
    mutating func record(appName: String, bundleId: String?, windowTitle: String?, at: Date, pinnedFrom: Date? = nil) -> Bool {
        let last = events.last
        if last?.appName == appName, last?.bundleId == bundleId, last?.windowTitle == windowTitle { return false }
        let sameApp = last?.appName == appName && last?.bundleId == bundleId
        events.append(WindowEvent(at: at, reason: sameApp ? .titleChanged : .activated, appName: appName, bundleId: bundleId, windowTitle: windowTitle))
        evict(now: at, pinnedFrom: pinnedFrom)
        return true
    }

    mutating func evict(now: Date, pinnedFrom: Date?) {
        let cutoff = min(now.addingTimeInterval(-retention), pinnedFrom ?? .distantFuture)
        guard let inForce = events.lastIndex(where: { $0.at <= cutoff }) else { return }
        events.removeFirst(inForce)
    }

    /// Events in `from...to`, preceded by the event that was in force at `from` (its own, earlier instant).
    func slice(from: Date, to: Date) -> [WindowEvent] {
        let inForce = events.last { $0.at <= from }
        return (inForce.map { [$0] } ?? []) + events.filter { $0.at > from && $0.at <= to }
    }
}
