import Foundation
import Observation

/// The pill's visual states (flows 6, 12). No state is entered without the employee's action;
/// in the shell, the Debug menu stands in for that action.
enum PillState: String, CaseIterable, Equatable {
    case idle, listening, recording, processing, paused, discarded
    /// Click-to-flag: the hand became a send icon and the voice note is recording.
    case capturing
    case sending, sent, notice

    var debugTitle: String {
        switch self {
        case .idle: "Idle"
        case .listening: "Listening"
        case .recording: "Recording"
        case .processing: "Processing"
        case .paused: "Screen context paused"
        case .discarded: "Discarded"
        case .capturing: "Capturing (send icon)"
        case .sending: "Sending"
        case .sent: "Sent"
        case .notice: "Notice"
        }
    }

    /// States that show words grow leftward from the screen edge into a card.
    var isExpanded: Bool { self != .idle && self != .paused && self != .capturing }
}

@Observable
final class PillModel {
    var state: PillState = .idle { didSet { if state != oldValue { onChange?() } } }
    var elapsed = 0
    var levels: [Double] = Array(repeating: 0.2, count: 12)
    var transcriptLine = "It says approved but I still have to call finance to release the PO to the supplier"
    var microphoneName = "MacBook Pro Microphone"
    var noticeText = ""

    @ObservationIgnored var onChange: (() -> Void)?
    @ObservationIgnored private var ticker: Task<Void, Never>?
    @ObservationIgnored private var discardTimer: Task<Void, Never>?

    /// Shows the given state, starting or stopping the sample recording animation.
    func show(_ new: PillState) {
        state = new
        ticker?.cancel()
        discardTimer?.cancel()
        if new == .recording {
            elapsed = 0
            ticker = Task { [weak self] in
                var ticks = 0
                while !Task.isCancelled {
                    try? await Task.sleep(for: .milliseconds(125))
                    guard let self, !Task.isCancelled else { return }
                    self.levels = Array(self.levels.dropFirst()) + [Double.random(in: 0.15...1)]
                    ticks += 1
                    if ticks % 8 == 0 { self.elapsed += 1 }
                }
            }
        }
        if new == .discarded || new == .sent || new == .notice {
            let seconds = new == .notice ? 6 : 2
            discardTimer = Task { [weak self] in
                try? await Task.sleep(for: .seconds(seconds))
                guard !Task.isCancelled else { return }
                self?.show(.idle)
            }
        }
    }

    /// Discard from Recording: "Discarded. Nothing sent." for 2 seconds, then Idle.
    func discard() { show(.discarded) }

    /// A short message in the card (a permission missing, a capture that failed), then Idle.
    func notice(_ text: String) {
        noticeText = text
        show(.notice)
    }

    var timerText: String { String(format: "%d:%02d", elapsed / 60, elapsed % 60) }
}
