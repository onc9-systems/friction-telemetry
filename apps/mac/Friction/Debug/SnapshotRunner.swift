#if DEBUG
import AppKit
import SwiftUI

/// Debug builds only. Launched with `-FrictionSnapshot <dir>`, the app renders its own windows to PNGs
/// (every pill state, the capture review panel, every main window surface) and quits. Rendering its own
/// views needs no Screen Recording permission, so agents and CI can review the UI.
enum SnapshotRunner {
    static var directory: URL? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-FrictionSnapshot"), args.indices.contains(i + 1) else { return nil }
        return URL(filePath: args[i + 1], directoryHint: .isDirectory)
    }

    static func write(_ view: NSView, to url: URL) {
        view.layoutSubtreeIfNeeded()
        // Render the layer tree: cacheDisplay misses split view and scroll view content.
        let scale = view.window?.backingScaleFactor ?? 2
        let size = view.bounds.size
        guard let layer = view.layer, size.width > 0, size.height > 0,
              let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size.width * scale), pixelsHigh: Int(size.height * scale),
                                         bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                         colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
              let ctx = NSGraphicsContext(bitmapImageRep: rep) else { return }
        rep.size = size
        let cg = ctx.cgContext
        cg.scaleBy(x: scale, y: scale)
        // The window server draws the window background, not the layer tree: paint it first.
        view.effectiveAppearance.performAsCurrentDrawingAppearance {
            cg.setFillColor(NSColor.windowBackgroundColor.cgColor)
        }
        cg.fill(CGRect(origin: .zero, size: size))
        if !view.isFlipped { } else { cg.translateBy(x: 0, y: size.height); cg.scaleBy(x: 1, y: -1) }
        layer.render(in: cg)
        try? rep.representation(using: .png, properties: [:])?.write(to: url)
    }

    @ViewBuilder static func surfaceView(_ surface: Surface) -> some View {
        switch surface {
        case .home: HomePage()
        case .ask: AskView()
        case .qa: QAView()
        case .initiatives: InitiativesView()
        case .insights: InsightsPage(initiativeId: .constant(nil), selected: .constant(nil))
        case .health: HealthView()
        case .settings: SettingsView()
        }
    }

    static func render(_ view: some View, size: CGSize, to url: URL) {
        let content = view
            .frame(width: size.width, height: size.height, alignment: .top)
            .background(Color(nsColor: .windowBackgroundColor))
            .environment(\.colorScheme, .dark)
            .environment(\.snapshotMode, true)
        let renderer = ImageRenderer(content: content)
        renderer.scale = 2
        guard let cg = renderer.cgImage else { return }
        let rep = NSBitmapImageRep(cgImage: cg)
        try? rep.representation(using: .png, properties: [:])?.write(to: url)
    }

    static func run(model: AppModel, pill: PillController, review: CaptureReviewPanelController, main: MainWindowController, into dir: URL) {
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        Task { @MainActor in
            func pause(_ ms: Int = 500) async { try? await Task.sleep(for: .milliseconds(ms)) }
            for state in PillState.allCases {
                pill.model.show(state)
                await pause(400)
                if let v = pill.panel.contentView { write(v, to: dir.appending(path: "pill-\(state.rawValue).png")) }
            }
            pill.model.show(.idle)
            pill.model.hovered = true
            await pause(400)
            if let v = pill.panel.contentView { write(v, to: dir.appending(path: "pill-idle-hover.png")) }
            pill.model.hovered = false

            review.show(on: NSScreen.main)
            await pause(800)
            if let v = review.panelContentView { write(v, to: dir.appending(path: "capture-review.png")) }
            review.close()

            model.isLeader = true
            main.show(surface: .home)
            await pause(1200)
            for surface in Surface.allCases {
                model.selection = surface
                await pause(900)
                if let v = main.contentView { write(v, to: dir.appending(path: "main-\(surface.rawValue).png")) }
            }
            model.selection = .home
            model.selectedRecordId = model.record.first { $0.outcome == .fixed }?.id
            await pause(1200)
            if let v = main.contentView { write(v, to: dir.appending(path: "main-home-detail.png")) }
            // SwiftUI's own renderer, for the surfaces the layer capture cannot see (glass, scroll views).
            for surface in Surface.allCases {
                model.selection = surface
                await pause(300)
                render(surfaceView(surface).environment(model), size: CGSize(width: 880, height: 900), to: dir.appending(path: "view-\(surface.rawValue).png"))
            }
            if let insight = model.data.insights.first {
                render(InsightEvidenceView(insight: insight).environment(model), size: CGSize(width: 440, height: 900), to: dir.appending(path: "view-insight-evidence.png"))
            }
            if let initiative = model.data.initiatives.first {
                render(InitiativeDetailView(initiative: initiative, onBack: {}).environment(model), size: CGSize(width: 880, height: 1300), to: dir.appending(path: "view-initiative-detail.png"))
            }
            if let item = model.record.first(where: { $0.outcome == .fixed }) {
                render(RecordDetailView(item: item).environment(model), size: CGSize(width: 440, height: 900), to: dir.appending(path: "view-home-detail.png"))
            }
            if ProcessInfo.processInfo.arguments.contains("-FrictionSnapshotStream") {
                model.selectedRecordId = nil
                for script in StubScript.allCases {
                    model.stubScript = script
                    model.ask("Do I need a second approval for suppliers we already use?")
                    await pause(3000)
                    if let turn = model.askTurns.last {
                        render(AnswerCardView(session: turn.session).padding(24), size: CGSize(width: 720, height: 760),
                               to: dir.appending(path: "answer-\(script.rawValue).png"))
                    }
                }
            }
            NSApp.terminate(nil)
        }
    }
}
#endif
