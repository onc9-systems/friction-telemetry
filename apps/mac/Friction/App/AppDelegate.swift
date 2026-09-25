import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var model: AppModel!
    private var pill: PillController!
    private var review: CaptureReviewPanelController!
    private var mainWindow: MainWindowController!
    private var statusMenu: StatusMenu!
    #if DEBUG
    private var debugMenu: DebugMenu!
    #endif

    func applicationWillFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            model = try AppModel(client: ShellClient())
        } catch {
            let alert = NSAlert()
            alert.messageText = "Friction couldn't load its sample data."
            alert.informativeText = String(describing: error)
            alert.runModal()
            NSApp.terminate(nil)
            return
        }
        mainWindow = MainWindowController(model: model)
        review = CaptureReviewPanelController(appModel: model)
        review.onSent = { [weak self] in self?.mainWindow.show(surface: .home) }

        pill = PillController()
        pill.onClick = { [weak self] in self?.mainWindow.show(surface: .home) }
        pill.onFinishRecording = { [weak self] in
            guard let self else { return }
            self.pill.model.show(.idle)
            self.review.show(on: self.pill.panel.screen)
        }
        pill.show()

        statusMenu = StatusMenu()
        statusMenu.onOpen = { [weak self] in self?.mainWindow.show() }
        #if DEBUG
        debugMenu = DebugMenu(model: model, pill: pill, showReview: { [weak self] in
            guard let self else { return }
            self.review.show(on: self.pill.panel.screen)
        })
        statusMenu.debugMenu = debugMenu.menu
        if let dir = SnapshotRunner.directory {
            SnapshotRunner.run(model: model, pill: pill, review: review, main: mainWindow, into: dir)
        }
        #endif
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    /// Clicking the Dock icon while the window is closed reopens it.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { mainWindow.show() }
        return true
    }
}
