import AppKit

/// The menu bar item: a static glyph, never animated, never badged in the shell.
final class StatusMenu: NSObject, NSMenuDelegate {
    private let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    private let menu = NSMenu()
    var onOpen: () -> Void = {}
    var debugMenu: NSMenu?

    override init() {
        super.init()
        item.button?.image = NSImage(systemSymbolName: "hand.raised", accessibilityDescription: "Friction")
        menu.delegate = self
        item.menu = menu
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        menu.addItem(withTitle: "Open Friction", action: #selector(open), keyEquivalent: "").target = self
        let flag = NSMenuItem(title: "Flag something (hold \(CaptureKeyDisplay.name))", action: nil, keyEquivalent: "")
        flag.isEnabled = false
        menu.addItem(flag)
        let pause = NSMenuItem(title: "Pause screen context", action: nil, keyEquivalent: "")
        pause.isEnabled = false
        menu.addItem(pause)
        menu.addItem(.separator())
        if let debugMenu {
            let debug = NSMenuItem(title: "Debug", action: nil, keyEquivalent: "")
            debug.submenu = debugMenu
            menu.addItem(debug)
        }
        menu.addItem(withTitle: "Quit Friction", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
    }

    @objc private func open() { onOpen() }
}
