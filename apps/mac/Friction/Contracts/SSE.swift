import Foundation

/// The answer stream (packages/contracts/src/sse.ts). On the wire: `event: <name>` and `data: <JSON payload>`.
nonisolated enum SSEEvent: Sendable, Equatable {
    struct Meta: Codable, Sendable, Equatable {
        let eventId: UUID
        let initiativeId: UUID
        let initiativeName: String
        let initiativeConfidence: Double
    }
    struct Provisional: Codable, Sendable, Equatable { let message: String }
    struct Delta: Codable, Sendable, Equatable { let text: String }
    struct CitationEvent: Codable, Sendable, Equatable {
        let index: Int
        let passageId: UUID?
        let qaEntryId: UUID?
        let quote: String
        let documentTitle: String
        let locator: String?
    }
    struct Class: Codable, Sendable, Equatable { let resolutionClass: ResolutionClass }
    struct Count: Codable, Sendable, Equatable { let othersCount: Int }
    struct Done: Codable, Sendable, Equatable { let answerId: UUID }
    struct Failure: Codable, Sendable, Equatable { let code: String; let message: String }

    case meta(Meta)
    case provisional(Provisional)
    case delta(Delta)
    case citation(CitationEvent)
    case resolutionClass(Class)
    case count(Count)
    case done(Done)
    case error(Failure)

    enum DecodeError: Error, Equatable { case unknownEvent(String) }

    /// Decodes one wire event. Unknown names throw, so a renamed event fails loudly rather than vanishing.
    init(name: String, data: Data) throws {
        let d = JSONDecoder.contract
        switch name {
        case "meta": self = .meta(try d.decode(Meta.self, from: data))
        case "provisional": self = .provisional(try d.decode(Provisional.self, from: data))
        case "delta": self = .delta(try d.decode(Delta.self, from: data))
        case "citation": self = .citation(try d.decode(CitationEvent.self, from: data))
        case "class": self = .resolutionClass(try d.decode(Class.self, from: data))
        case "count": self = .count(try d.decode(Count.self, from: data))
        case "done": self = .done(try d.decode(Done.self, from: data))
        case "error": self = .error(try d.decode(Failure.self, from: data))
        default: throw DecodeError.unknownEvent(name)
        }
    }
}

/// One step of a scripted stub stream (fixtures `stub-*.json`).
nonisolated struct ScriptStep: Decodable, Sendable {
    let delayMs: Int
    let event: String
    let data: JSONValue
}

/// Minimal JSON value so script payloads can be re-encoded and fed through `SSEEvent(name:data:)`.
nonisolated enum JSONValue: Codable, Sendable, Equatable {
    case string(String), number(Double), bool(Bool), object([String: JSONValue]), array([JSONValue]), null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let b = try? c.decode(Bool.self) { self = .bool(b) }
        else if let n = try? c.decode(Double.self) { self = .number(n) }
        else if let s = try? c.decode(String.self) { self = .string(s) }
        else if let a = try? c.decode([JSONValue].self) { self = .array(a) }
        else { self = .object(try c.decode([String: JSONValue].self)) }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let s): try c.encode(s)
        case .number(let n): if n.rounded() == n, abs(n) < 1e15 { try c.encode(Int(n)) } else { try c.encode(n) }
        case .bool(let b): try c.encode(b)
        case .object(let o): try c.encode(o)
        case .array(let a): try c.encode(a)
        case .null: try c.encodeNil()
        }
    }
}
