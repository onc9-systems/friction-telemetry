import AppKit
import CoreGraphics

/// Samples the frontmost window: on every app switch (NSWorkspace activation notification) and once a
/// second, because a title change inside one app (a new tab, another SAP screen) posts no notification.
/// Titles come from the window list, which needs the Screen Recording permission the buffer already has.
final class WindowTimeline {
    private let clock: CaptureClock
    private(set) var log = WindowLog(retention: ScreenBuffer.retention)
    private var pinnedFrom: Date?
    private var timer: Timer?
    private var observer: NSObjectProtocol?

    init(clock: CaptureClock) { self.clock = clock }

    func start() {
        guard timer == nil else { return }
        observer = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main
        ) { [weak self] _ in MainActor.assumeIsolated { self?.sample() } }
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in MainActor.assumeIsolated { self?.sample() } }
        sample()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        if let observer { NSWorkspace.shared.notificationCenter.removeObserver(observer) }
        observer = nil
    }

    func pin(from: Date) { pinnedFrom = from }
    func unpin() { pinnedFrom = nil }

    func slice(from: Date, to: Date) -> [WindowEvent] {
        sample()
        return log.slice(from: from, to: to)
    }

    private func sample() {
        guard let app = NSWorkspace.shared.frontmostApplication else { return }
        log.record(
            appName: app.localizedName ?? app.bundleIdentifier ?? "Unknown app",
            bundleId: app.bundleIdentifier,
            windowTitle: Self.frontWindowTitle(of: app.processIdentifier),
            at: clock.wall(CaptureClock.now()),
            pinnedFrom: pinnedFrom
        )
    }

    /// The title of the app's frontmost normal window. The window list is ordered front to back.
    static func frontWindowTitle(of pid: pid_t) -> String? {
        guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return nil }
        for window in list {
            guard (window[kCGWindowOwnerPID as String] as? pid_t) == pid, (window[kCGWindowLayer as String] as? Int) == 0 else { continue }
            let title = window[kCGWindowName as String] as? String
            return title?.isEmpty == false ? title : nil
        }
        return nil
    }
}
