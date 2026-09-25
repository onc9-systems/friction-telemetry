import AppKit
import SwiftUI

/// The capture review panel: a second non-activating panel that CAN become key, so the transcript
/// takes typing while the employee's app keeps its menu bar until they interact with the panel.
final class CaptureReviewPanelController {
    private var panel: FloatingPanel?
    private let appModel: AppModel

    init(appModel: AppModel) { self.appModel = appModel }

    func show(on screen: NSScreen?) {
        close()
        let initiatives = appModel.liveInitiatives
        guard let first = initiatives.first else { return }
        let review = CaptureReviewModel(initiativeId: first.id)
        let panel = FloatingPanel(contentRect: NSRect(x: 0, y: 0, width: 560, height: 640), keyable: true)
        panel.hasShadow = true
        let view = CaptureReviewView(model: review, initiatives: initiatives, onSend: { [weak self, weak review] in
            guard let self, let review else { return }
            self.appModel.sendFlag(
                transcript: review.removed.contains(.transcript) ? "" : review.transcript,
                initiativeId: review.initiativeId,
                appNames: review.remaining.contains(.apps) ? review.appNames : [],
                hasScreenshot: review.remaining.contains(.screenshot),
                hasClip: review.remaining.contains(.clip))
            self.close()
            self.onSent?()
        }, onDiscard: { [weak self] in self?.close() })
        panel.contentView = FirstMouseHostingView(rootView: view)
        let visible = (screen ?? NSScreen.main)?.visibleFrame ?? .zero
        panel.setFrame(NSRect(x: visible.midX - 280, y: visible.midY - 320, width: 560, height: 640), display: true)
        panel.orderFrontRegardless()
        self.panel = panel
    }

    var onSent: (() -> Void)?
    var panelContentView: NSView? { panel?.contentView }

    func close() {
        panel?.orderOut(nil)
        panel = nil
    }
}
