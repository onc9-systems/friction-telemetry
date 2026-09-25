import AppKit
import SwiftUI

/// The one main window, both surfaces in one sidebar. Hosted in an AppKit NSWindow so the app joins
/// the Dock only while it is open. SwiftUI toolbar items bridge into the window (sceneBridgingOptions).
final class MainWindowController: NSObject, NSWindowDelegate {
    private var window: NSWindow?
    private let model: AppModel
    private let outbox: Outbox
    private let engine: CaptureEngine

    init(model: AppModel, outbox: Outbox, engine: CaptureEngine) {
        self.model = model
        self.outbox = outbox
        self.engine = engine
    }

    var isOpen: Bool { window?.isVisible == true }
    var contentView: NSView? { window?.contentView }

    func show(surface: Surface? = nil) {
        if let surface { model.selection = surface }
        if let window {
            ActivationPolicy.regularWindowWillOpen(window)
            window.makeKeyAndOrderFront(nil)
            return
        }
        let controller = NSHostingController(rootView: MainView().environment(model).environment(outbox).environment(engine))
        controller.sceneBridgingOptions = [.toolbars]
        let window = NSWindow(contentViewController: controller)
        window.title = "Friction"
        window.titleVisibility = .hidden
        window.styleMask = [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView]
        window.toolbarStyle = .unified
        window.setContentSize(NSSize(width: 1100, height: 720))
        window.minSize = NSSize(width: 760, height: 480)
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.setFrameAutosaveName("FrictionMain")
        if !window.setFrameUsingName("FrictionMain") { window.center() }
        self.window = window
        ActivationPolicy.regularWindowWillOpen(window)
        window.makeKeyAndOrderFront(nil)
    }

    func windowWillClose(_ notification: Notification) {
        guard let window = notification.object as? NSWindow else { return }
        ActivationPolicy.regularWindowDidClose(window)
    }
}
