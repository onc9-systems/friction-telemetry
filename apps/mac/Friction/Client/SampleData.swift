import Foundation

/// Everything the shell shows, loaded from the contract fixtures bundled at `Contents/Resources/fixtures/`.
/// Feature phases replace one `FrictionClient` method at a time; the screens keep reading the same shapes.
nonisolated struct SampleData: Sendable {
    var workspace: Workspace
    var initiatives: [Initiative]
    var members: [InitiativeMember]
    var theses: [Thesis]
    var documents: [FrictionDocument]
    var versions: [DocumentVersion]
    var passages: [Passage]
    var flags: [Flag]
    var questions: [Question]
    var answers: [Answer]
    var record: [MyRecordItem]
    var qaEntries: [QAEntry]
    var clusters: [Cluster]
    var insights: [Insight]
    var evidence: [InsightEvidence]
    var fixes: [Fix]
    var health: [Health]
    var notices: [Notice]

    /// The newest sample item's day. Loading shifts every instant so this day lands on today,
    /// which keeps "Today" and "Yesterday" meaningful whenever the shell is opened.
    static let anchorDay = DateComponents(calendar: Calendar(identifier: .gregorian), timeZone: TimeZone(identifier: "UTC"), year: 2026, month: 9, day: 24).date!

    static func load(from directory: URL, now: Date = .now, calendar: Calendar = .current) throws -> SampleData {
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: anchorDay), to: calendar.startOfDay(for: now)).day ?? 0
        let decoder = JSONDecoder.contract
        let base = decoder.dateDecodingStrategy
        let shift = TimeInterval(days) * 86_400
        decoder.dateDecodingStrategy = .custom { d in
            guard case .custom(let parse) = base else { throw DecodingError.dataCorrupted(.init(codingPath: d.codingPath, debugDescription: "No base strategy")) }
            return try parse(d).addingTimeInterval(shift)
        }
        func read<T: Decodable>(_ name: String, as: T.Type = T.self) throws -> T {
            try decoder.decode(T.self, from: Data(contentsOf: directory.appending(path: name)))
        }
        return SampleData(
            workspace: try read("workspace.json"),
            initiatives: try read("initiatives.json"),
            members: try read("initiative-members.json"),
            theses: try read("theses.json"),
            documents: try read("documents.json"),
            versions: try read("document-versions.json"),
            passages: try read("passages.json"),
            flags: try read("flags.json"),
            questions: try read("questions.json"),
            answers: try read("answers.json"),
            record: try read("my-record.json"),
            qaEntries: try read("qa-entries.json"),
            clusters: try read("clusters.json"),
            insights: try read("insights.json"),
            evidence: try read("insight-evidence.json"),
            fixes: try read("fixes.json"),
            health: try read("health.json"),
            notices: try read("notices.json")
        )
    }

    /// The fixtures folder inside the app bundle.
    static var bundledDirectory: URL {
        Bundle(for: BundleToken.self).resourceURL!.appending(path: "fixtures")
    }
}

private final class BundleToken {}
