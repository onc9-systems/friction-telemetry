import Foundation

/// Everything the answer card shows, built only from stream events (flows 6, 7, 8).
nonisolated struct AnswerState: Equatable, Sendable {
    enum Phase: Equatable, Sendable { case waiting, checking, streaming, finished, failed }

    var phase: Phase = .waiting
    var initiativeName: String?
    var provisionalMessage: String?
    var text = ""
    var citations: [SSEEvent.CitationEvent] = []
    /// Set only by a `class` event, never inferred.
    var resolutionClass: ResolutionClass?
    var othersCount: Int?
    var answerId: UUID?
    /// "Update: the docs do cover this." shown above the answer when a real answer follows a provisional line.
    var showsUpdateNote = false
    var failure: String?
    /// "This didn't solve it" pressed; in the shell this flips the class locally.
    var markedStillStuck = false

    static let savedOnThisMac = "Couldn't reach Friction. Your flag is saved on this Mac and will send when the connection returns."
    static let stillStuckConfirmation = "Sent to owner. The cited passage is marked for review."

    /// Builds the finished state of an answer the service already stored (Home detail for past items).
    init(finished answer: Answer, initiativeName: String?, resolutionClass: ResolutionClass?, othersCount: Int) {
        self.phase = .finished
        self.initiativeName = initiativeName
        self.text = answer.text
        self.citations = answer.citations.enumerated().map { i, c in
            .init(index: i + 1, passageId: c.passageId, qaEntryId: c.qaEntryId, quote: c.quote, documentTitle: c.documentTitle, locator: c.locator)
        }
        self.resolutionClass = resolutionClass
        self.othersCount = othersCount
        self.answerId = answer.id
    }

    init() {}
}

nonisolated enum AnswerInput: Equatable, Sendable {
    case started
    case event(SSEEvent)
    case transportFailed
    case markStillStuck
}

nonisolated enum AnswerReducer {
    static func reduce(_ state: AnswerState, _ input: AnswerInput) -> AnswerState {
        var s = state
        switch input {
        case .started:
            s = AnswerState()
            s.phase = .checking
        case .event(let event):
            switch event {
            case .meta(let m):
                s.initiativeName = m.initiativeName
                if s.phase == .waiting { s.phase = .checking }
            case .provisional(let p):
                s.provisionalMessage = p.message
            case .delta(let d):
                s.text += d.text
                s.phase = .streaming
            case .citation(let c):
                s.citations.append(c)
            case .resolutionClass(let c):
                s.resolutionClass = c.resolutionClass
                // Never silently drop the provisional line: if a real answer follows it, say so.
                if s.provisionalMessage != nil, c.resolutionClass == .answered { s.showsUpdateNote = true }
            case .count(let c):
                s.othersCount = c.othersCount
            case .done(let d):
                s.answerId = d.answerId
                s.phase = .finished
            case .error:
                s.phase = .failed
                s.failure = AnswerState.savedOnThisMac
            }
        case .transportFailed:
            if s.phase != .finished {
                s.phase = .failed
                s.failure = AnswerState.savedOnThisMac
            }
        case .markStillStuck:
            guard s.phase == .finished else { return s }
            s.resolutionClass = .stillStuck
            s.markedStillStuck = true
        }
        return s
    }
}
