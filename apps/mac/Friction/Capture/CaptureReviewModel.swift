import Foundation
import Observation

/// What the capture review panel will send (flow 6). Everything is removable; removed rows can be undone.
@Observable
final class CaptureReviewModel {
    enum Item: String, CaseIterable, Identifiable {
        case transcript, screenshot, clip, apps
        var id: String { rawValue }
        var title: String {
            switch self {
            case .transcript: "Transcript"
            case .screenshot: "Screenshot"
            case .clip: "Clip"
            case .apps: "Apps"
            }
        }
    }

    var transcript = "I raised the PO for the pallet wrap in Ariba and it's approved, but the status still says I have to call finance to release it to the supplier. The policy says it should go automatically."
    var initiativeId: UUID
    var removed: Set<Item> = []
    var appNames = ["Chrome", "SAP Ariba", "Slack"]
    /// Redaction boxes drawn on the screenshot, in unit coordinates (0...1) of the image.
    var boxes: [CGRect] = []
    var editingScreenshot = false

    init(initiativeId: UUID) { self.initiativeId = initiativeId }

    /// Rows still being sent. The apps row counts only while at least one app chip remains.
    var remaining: [Item] {
        Item.allCases.filter { !removed.contains($0) && ($0 != .apps || !appNames.isEmpty) }
    }

    var sendTitle: String {
        let n = remaining.count
        return n == 1 ? "Send 1 item" : "Send \(n) items"
    }

    var canSend: Bool {
        !remaining.isEmpty && (removed.contains(.transcript) || !transcript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || remaining.count > 1)
    }

    func remove(_ item: Item) { removed.insert(item) }
    func undo(_ item: Item) { removed.remove(item) }
}
