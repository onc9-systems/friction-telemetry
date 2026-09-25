import AppKit

/// The one owner of the Dock presence. Menu bar only (`.accessory`) until a regular window opens;
/// back to `.accessory` when the last one closes. Later phases (setup window, Sparkle) route through here too.
enum ActivationPolicy {
    private static var openWindows: Set<ObjectIdentifier> = []

    /// Brings Friction forward for a window the employee asked for (a pill click, the menu).
    /// `activate()` is cooperative and is refused here: the click landed on a non-activating panel, so the
    /// frontmost app never yielded. The request is always the employee's own click, so activate regardless.
    static func regularWindowWillOpen(_ window: NSWindow) {
        openWindows.insert(ObjectIdentifier(window))
        if NSApp.activationPolicy() != .regular { NSApp.setActivationPolicy(.regular) }
        NSApp.activate(ignoringOtherApps: true)
    }

    static func regularWindowDidClose(_ window: NSWindow) {
        openWindows.remove(ObjectIdentifier(window))
        if openWindows.isEmpty { NSApp.setActivationPolicy(.accessory) }
    }
}
