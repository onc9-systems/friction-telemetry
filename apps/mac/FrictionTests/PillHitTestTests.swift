import AppKit
import Testing
@testable import Friction

/// Clicks on the pill must reach the pill's own view, which accepts the first click while the app is inactive.
/// A SwiftUI subview catching the click would swallow it (subviews refuse first mouse).
@MainActor @Suite(.serialized)
struct PillHitTestTests {
    @Test func givenTheIdlePill_whenClickedInTheMiddle_thenThePillViewItselfReceivesTheClick() throws {
        let pill = PillController()
        pill.show()
        let host = try #require(pill.panel.contentView)
        host.layoutSubtreeIfNeeded()
        let center = NSPoint(x: host.bounds.midX, y: host.bounds.midY)
        let hit = host.hitTest(host.superview.map { host.convert(center, to: $0) } ?? center)
        #expect(hit === host, "click landed on \(String(describing: hit))")
        #expect(hit?.acceptsFirstMouse(for: nil) == true)
        pill.panel.orderOut(nil)
    }
}
