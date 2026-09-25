import AppKit
import SwiftUI

/// A non-activating floating panel. The style mask is set once at init and never mutated
/// (mutating it later misbehaves on macOS 26). `keyable` panels take typing without activating the app.
final class FloatingPanel: NSPanel {
    private let keyable: Bool

    init(contentRect: NSRect, keyable: Bool) {
        self.keyable = keyable
        super.init(contentRect: contentRect, styleMask: [.nonactivatingPanel, .borderless], backing: .buffered, defer: false)
        isFloatingPanel = true
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
        hidesOnDeactivate = false
        becomesKeyOnlyIfNeeded = keyable
        isReleasedWhenClosed = false
        animationBehavior = .none
        isOpaque = false
        backgroundColor = .clear
        hasShadow = true
        isMovableByWindowBackground = false
    }

    // Borderless windows cannot become key unless this is overridden; the pill never does.
    override var canBecomeKey: Bool { keyable }
    override var canBecomeMain: Bool { false }
}

/// A hosting view that takes the first click, so clicking a panel never needs a focusing click first.
class FirstMouseHostingView<Content: View>: NSHostingView<Content> {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}
