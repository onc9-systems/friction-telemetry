import Foundation
import Observation

/// One live answer: posts the body, feeds every event through `AnswerReducer`, publishes the state.
@Observable
final class AnswerSession: Identifiable {
    let id: UUID
    /// False for a stored answer shown as it finished; true for one streaming in this session.
    let isLive: Bool
    private(set) var state = AnswerState()
    @ObservationIgnored private var task: Task<Void, Never>?

    init(id: UUID) {
        self.id = id
        self.isLive = true
    }

    /// A session showing an answer that already finished (past Home items).
    init(finished state: AnswerState, id: UUID) {
        self.id = id
        self.isLive = false
        self.state = state
    }

    func start(body: EventBody, script: StubScript, client: FrictionClient) {
        task?.cancel()
        apply(.started)
        let stream = client.streamAnswer(for: body, script: script)
        task = Task { [weak self] in
            do {
                for try await event in stream { self?.apply(.event(event)) }
                if self?.state.phase != .finished { self?.apply(.transportFailed) }
            } catch {
                self?.apply(.transportFailed)
            }
        }
    }

    func markStillStuck() { apply(.markStillStuck) }

    private func apply(_ input: AnswerInput) {
        state = AnswerReducer.reduce(state, input)
    }
}
