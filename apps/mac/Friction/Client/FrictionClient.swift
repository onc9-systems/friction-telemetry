import Foundation

/// Which scripted answer the shell's stub streams (header `x-ft-stub-script`).
nonisolated enum StubScript: String, CaseIterable, Sendable {
    case answered
    case provisionalRouted = "provisional_routed"

    var title: String {
        switch self {
        case .answered: "Answered"
        case .provisionalRouted: "Provisional then routed"
        }
    }
}

/// The body of `POST /v1/events`: a Flag or a Question, encoded exactly as the contract describes.
nonisolated enum EventBody: Sendable {
    case flag(Flag)
    case question(Question)

    var id: UUID {
        switch self {
        case .flag(let f): f.id
        case .question(let q): q.id
        }
    }

    func encoded() throws -> Data {
        switch self {
        case .flag(let f): try JSONEncoder.contract.encode(f)
        case .question(let q): try JSONEncoder.contract.encode(q)
        }
    }
}

/// All data access. Views never call URLSession. The shell reads fixtures for everything except
/// the health check and the answer stream, which go to the local Worker.
protocol FrictionClient: AnyObject {
    func sampleData() throws -> SampleData
    func serviceIsReachable() async -> Bool
    func streamAnswer(for body: EventBody, script: StubScript) -> AsyncThrowingStream<SSEEvent, Error>
}

/// The shell's client: fixtures from the bundle, plus the live health check and answer stream.
final class ShellClient: FrictionClient {
    let live: LiveClient
    private let fixtures: URL

    init(fixtures: URL = SampleData.bundledDirectory, live: LiveClient = LiveClient()) {
        self.fixtures = fixtures
        self.live = live
    }

    func sampleData() throws -> SampleData { try SampleData.load(from: fixtures) }
    func serviceIsReachable() async -> Bool { await live.serviceIsReachable() }
    func streamAnswer(for body: EventBody, script: StubScript) -> AsyncThrowingStream<SSEEvent, Error> {
        live.streamAnswer(for: body, script: script)
    }
}
