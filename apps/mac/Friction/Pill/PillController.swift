import AppKit
import OSLog
import SwiftUI

let pillLog = Logger(subsystem: "systems.onc9.friction", category: "pill")

/// Owns the pill panel: shows it over every app and Space without taking focus, resizes it
/// leftward from its anchor as its state changes, lets it be dragged, and opens Home on click.
final class PillController {
    let model = PillModel()
    let panel: FloatingPanel
    private let hosting: PillHostingView
    private var store = PillPositionStore()
    var onClick: () -> Void = {}
    var onFinishRecording: () -> Void = {}

    init() {
        panel = FloatingPanel(contentRect: NSRect(x: 0, y: 0, width: 32, height: 58), keyable: false)
        hosting = PillHostingView(rootView: AnyView(EmptyView()))
        hosting.rootView = AnyView(PillView(model: model, onFinish: { [weak self] in self?.onFinishRecording() }))
        hosting.sizingOptions = [.intrinsicContentSize]
        panel.contentView = hosting
        hosting.onClick = { [weak self] in self?.onClick() }
        hosting.onDragEnded = { [weak self] in self?.saveAnchor() }
        hosting.acceptsSwiftUIClicks = { [weak self] in self?.model.state == .recording }
        model.onChange = { [weak self] in DispatchQueue.main.async { self?.relayout(animated: true) } }
    }

    func show() {
        relayout(animated: false)
        panel.orderFrontRegardless()
    }

    /// Screen the pill lives on: the one it is on now, else the main screen.
    private var screen: NSScreen? { panel.screen ?? NSScreen.main ?? NSScreen.screens.first }

    func relayout(animated: Bool) {
        guard let screen else { return }
        hosting.layoutSubtreeIfNeeded()
        let size = hosting.fittingSize
        let anchor = hosting.isDragging ? PillPositionStore.anchor(for: panel.frame, in: screen.visibleFrame) : store.anchor(for: screen)
        let frame = PillPositionStore.frame(size: size, anchor: anchor, in: screen.visibleFrame)
        panel.setFrame(frame, display: true, animate: false)
        _ = animated
    }

    private func saveAnchor() {
        guard let screen else { return }
        store.save(PillPositionStore.anchor(for: panel.frame, in: screen.visibleFrame), for: screen)
        relayout(animated: false)
    }

    func resetPosition() {
        store.reset()
        relayout(animated: false)
    }
}

/// Hosting view for the pill: drag to move (more than 3 pt), click to flag. No hover state.
/// In Recording, clicks go to the SwiftUI buttons.
final class PillHostingView: FirstMouseHostingView<AnyView> {
    var onClick: () -> Void = {}
    var onDragEnded: () -> Void = {}
    var acceptsSwiftUIClicks: () -> Bool = { false }
    private(set) var isDragging = false
    private var downPoint: NSPoint?
    private var downOrigin: NSPoint?

    override func mouseDown(with event: NSEvent) {
        pillLog.info("mouse down")
        if acceptsSwiftUIClicks() { return super.mouseDown(with: event) }
        downPoint = NSEvent.mouseLocation
        downOrigin = window?.frame.origin
        isDragging = false
    }

    override func mouseDragged(with event: NSEvent) {
        if acceptsSwiftUIClicks() { return super.mouseDragged(with: event) }
        guard let downPoint, let downOrigin, let window else { return }
        let now = NSEvent.mouseLocation
        let dx = now.x - downPoint.x, dy = now.y - downPoint.y
        if !isDragging, hypot(dx, dy) <= 3 { return }
        isDragging = true
        window.setFrameOrigin(NSPoint(x: downOrigin.x + dx, y: downOrigin.y + dy))
    }

    override func mouseUp(with event: NSEvent) {
        if acceptsSwiftUIClicks() { return super.mouseUp(with: event) }
        defer { downPoint = nil; downOrigin = nil; isDragging = false }
        pillLog.info("mouse up, dragged: \(self.isDragging)")
        if isDragging { onDragEnded() } else { onClick() }
    }
}
