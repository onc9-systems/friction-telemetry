import Foundation
import Observation

/// The pill's visual states (flows 6, 12). No state is entered without the employee's action;
/// in the shell, the Debug menu stands in for that action.
enum PillState: String, CaseIterable, Equatable {
    case idle, listening, recording, processing, paused, discarded

    var debugTitle: String {
        switch self {
        case .idle: "Idle"
        case .listening: "Listening"
        case .recording: "Recording"
        case .processing: "Processing"
        case .paused: "Screen context paused"
        case .discarded: "Discarded"
        }
    }

    /// States that show words grow leftward from the screen edge into a card.
    var isExpanded: Bool { self != .idle && self != .paused }
}

@Observable
final class PillModel {
    var state: PillState = .idle { didSet { if state != oldValue { onChange?() } } }
    var hovered = false { didSet { if hovered != oldValue { onChange?() } } }
    var elapsed = 0
    var levels: [Double] = Array(repeating: 0.2, count: 12)
    var transcriptLine = "It says approved but I still have to call finance to release the PO to the supplier"
    var microphoneName = "MacBook Pro Microphone"

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
        if new == .discarded {
            discardTimer = Task { [weak self] in
                try? await Task.sleep(for: .seconds(2))
                guard !Task.isCancelled else { return }
                self?.show(.idle)
            }
        }
    }

    /// Discard from Recording: "Discarded. Nothing sent." for 2 seconds, then Idle.
    func discard() { show(.discarded) }

    var timerText: String { String(format: "%d:%02d", elapsed / 60, elapsed % 60) }
}
