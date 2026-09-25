import AppKit

private extension Double {
    var nonZero: Double? { self == 0 ? nil : self }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var model: AppModel!
    private var pill: PillController!
    private var review: CaptureReviewPanelController!
    private var mainWindow: MainWindowController!
    private var statusMenu: StatusMenu!
    private let engine = CaptureEngine()
    private var outbox: Outbox!
    #if DEBUG
    private var debugMenu: DebugMenu!
    #endif

    func applicationWillFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            model = try AppModel(client: ShellClient(), directory: Identity.bundledDirectory())
        } catch {
            let alert = NSAlert()
            alert.messageText = "Friction couldn't load its sample data."
            alert.informativeText = String(describing: error)
            alert.runModal()
            NSApp.terminate(nil)
            return
        }
        outbox = Outbox(api: CaptureAPI(baseURL: LiveClient.configuredBaseURL))
        mainWindow = MainWindowController(model: model, outbox: outbox, engine: engine)
        review = CaptureReviewPanelController(appModel: model)
        review.onSent = { [weak self] in self?.mainWindow.show(surface: .home) }

        pill = PillController()
        pill.onClick = { [weak self] in self?.togglePillFlag() }
        Task { await engine.start() }
        pill.onFinishRecording = { [weak self] in
            guard let self else { return }
            self.pill.model.show(.idle)
            self.review.show(on: self.pill.panel.screen)
        }
        pill.show()

        statusMenu = StatusMenu(model: model)
        statusMenu.onOpen = { [weak self] in self?.mainWindow.show() }
        // `-FrictionOpenSurface intake`: opens the main window on that surface at launch (any build).
        if let raw = UserDefaults.standard.string(forKey: "FrictionOpenSurface"), let surface = Surface(rawValue: raw) {
            mainWindow.show(surface: surface)
        }
        #if DEBUG
        debugMenu = DebugMenu(model: model, pill: pill, showReview: { [weak self] in
            guard let self else { return }
            self.review.show(on: self.pill.panel.screen)
        })
        statusMenu.debugMenu = debugMenu.menu
        if let dir = SnapshotRunner.directory {
            SnapshotRunner.run(model: model, pill: pill, review: review, main: mainWindow, into: dir)
        }
        // `-FrictionAutoFlag <seconds>`: clicks the hand, waits, clicks send. End-to-end check without a person.
        let autoFlag = UserDefaults.standard.double(forKey: "FrictionAutoFlag")
        if autoFlag > 0 {
            let delay = UserDefaults.standard.double(forKey: "FrictionAutoFlagDelay").nonZero ?? 8
            Task {
                try? await Task.sleep(for: .seconds(delay))
                togglePillFlag()
                try? await Task.sleep(for: .seconds(autoFlag))
                togglePillFlag()
            }
        }
        #endif
    }

    /// Temporary flow until the real one is designed: click the hand to start, click the send icon to send.
    /// It only drives the capture engine and the outbox, so a new flow replaces this method and nothing else.
    private func togglePillFlag() {
        switch pill.model.state {
        case .capturing:
            pill.model.show(.sending)
            Task {
                do {
                    try outbox.enqueue(try await engine.finishFlag())
                    pill.model.show(.sent)
                } catch {
                    pill.model.notice(error.localizedDescription)
                }
            }
        case .sending:
            return
        default:
            guard !engine.isStartingFlag else { return }
            Task {
                do {
                    try await engine.startFlag()
                    pill.model.show(.capturing)
                } catch {
                    pill.model.notice(error.localizedDescription)
                }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    /// Clicking the Dock icon while the window is closed reopens it.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag { mainWindow.show() }
        return true
    }
}
