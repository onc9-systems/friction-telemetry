import AppKit
import Testing
@testable import Friction

/// The pill must never take focus and must float over every Space and other apps' full-screen windows.
@MainActor @Suite(.serialized)
struct PillPanelTests {
    @Test func givenThePill_thenItCannotBecomeKeyOrMainAndIsNonActivating() {
        let pill = PillController()
        #expect(pill.panel.canBecomeKey == false)
        #expect(pill.panel.canBecomeMain == false)
        #expect(pill.panel.styleMask.contains(.nonactivatingPanel))
        #expect(pill.panel.hidesOnDeactivate == false)
    }

    @Test func givenThePill_thenItJoinsAllSpacesAndShowsOverFullScreenApps() {
        let pill = PillController()
        #expect(pill.panel.collectionBehavior.contains(.canJoinAllSpaces))
        #expect(pill.panel.collectionBehavior.contains(.fullScreenAuxiliary))
        #expect(pill.panel.level == .floating)
    }

    @Test func givenTheCaptureReviewPanel_thenItTakesTypingWithoutActivatingTheApp() {
        let panel = FloatingPanel(contentRect: .init(x: 0, y: 0, width: 560, height: 640), keyable: true)
        #expect(panel.canBecomeKey)
        #expect(panel.styleMask.contains(.nonactivatingPanel))
    }

    @Test func givenAnAnchor_whenTheContentGrows_thenTheRightEdgeAndCenterStayPut() {
        let visible = NSRect(x: 0, y: 0, width: 1440, height: 900)
        let anchor = PillPositionStore.Anchor(rightInset: 12, centerFraction: 0.5)
        let small = PillPositionStore.frame(size: .init(width: 44, height: 88), anchor: anchor, in: visible)
        let wide = PillPositionStore.frame(size: .init(width: 300, height: 60), anchor: anchor, in: visible)
        #expect(small.maxX == 1428)
        #expect(wide.maxX == 1428)
        #expect(small.midY == 450)
        #expect(wide.midY == 450)
        #expect(PillPositionStore.anchor(for: wide, in: visible) == anchor)
    }
}
