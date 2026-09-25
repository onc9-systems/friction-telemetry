import Foundation

// Codable mirrors of packages/contracts/src/concepts/*.ts. Property names match the JSON keys.
// Calendar dates ("2026-10-31") stay strings; instants decode to Date via JSONDecoder.contract.

nonisolated struct Organization: Codable, Sendable, Hashable {
    let id: String
    let name: String
}

nonisolated struct Person: Codable, Sendable, Hashable, Identifiable {
    let id: String
    let name: String
    let email: String
    let title: String?
    let leader: Bool
}

nonisolated struct Workspace: Codable, Sendable, Hashable {
    let organization: Organization
    let people: [Person]
    let signedInUserId: String
}

nonisolated struct Initiative: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let organizationId: String
    let name: String
    let whatIsChanging: String
    let why: String
    let status: InitiativeStatus
    let targetDate: String?
    let createdAt: Date
    let closedAt: Date?
}

nonisolated struct InitiativeMember: Codable, Sendable, Hashable {
    let initiativeId: UUID
    let userId: String
    let role: MemberRole
}

nonisolated struct Thesis: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let initiativeId: UUID
    let statement: String
    let verdict: ThesisVerdict
    let position: Int
}

nonisolated struct FrictionDocument: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let initiativeId: UUID
    let title: String
    let activeVersionId: UUID?
    let suspect: Bool
    let createdAt: Date
}

nonisolated struct DocumentVersion: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let documentId: UUID
    let r2Key: String
    let mimeType: String
    let byteSize: Int
    let status: DocumentVersionStatus
    let failureReason: String?
    let passageCount: Int?
    let createdAt: Date
}

nonisolated struct Passage: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let documentVersionId: UUID
    let initiativeId: UUID
    let headingPath: String
    let locator: Int?
    let text: String
    let position: Int
}

nonisolated struct Flag: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let initiativeId: UUID?
    let transcript: String
    let screenshotKey: String?
    let clipKey: String?
    let appNames: [String]
    let resolutionClass: ResolutionClass?
    let createdAt: Date
}

nonisolated struct Question: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let initiativeId: UUID
    let text: String
    let resolutionClass: ResolutionClass?
    let createdAt: Date
}

/// Exactly one of `passageId` and `qaEntryId` is set (enforced by the Zod schema).
nonisolated struct Citation: Codable, Sendable, Hashable {
    let passageId: UUID?
    let qaEntryId: UUID?
    let quote: String
    let documentTitle: String
    let locator: String?
}

/// Exactly one of `flagId` and `questionId` is set (enforced by the Zod schema).
nonisolated struct Answer: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let flagId: UUID?
    let questionId: UUID?
    let text: String
    let citations: [Citation]
    let provisionalShown: Bool
    let createdAt: Date
}

nonisolated struct QAEntry: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let initiativeId: UUID
    let question: String
    let answer: String?
    let status: QAEntryStatus
    let approvedByUserId: String?
    let approvedAt: Date?
    let askedCount: Int
    let askedByMe: Bool
}

nonisolated struct Cluster: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let initiativeId: UUID
    let canonical: String
    let memberCount: Int
}

nonisolated struct ClassSplit: Codable, Sendable, Hashable {
    let answered: Int
    let unanswerable: Int
    let stillStuck: Int
}

nonisolated struct ThesisLink: Codable, Sendable, Hashable {
    let thesisId: UUID
    let relation: ThesisRelation
}

nonisolated struct Insight: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let initiativeId: UUID
    let title: String
    let clusterIds: [UUID]
    let thesisLinks: [ThesisLink]
    let classSplit: ClassSplit
    let ownerUserId: String?
    let fixId: UUID?
    let evidenceVisible: Bool
}

nonisolated struct EvidenceExcerpt: Codable, Sendable, Hashable {
    let text: String
    let day: String
    let appNames: [String]
    let hasScreenshot: Bool
}

nonisolated struct InsightEvidence: Codable, Sendable, Hashable {
    let insightId: UUID
    let weeklyCounts: [Int]
    let excerpts: [EvidenceExcerpt]
    let suspectDocumentIds: [UUID]
}

nonisolated struct Fix: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let insightId: UUID
    let recordedByUserId: String
    let summary: String
    let recordedAt: Date
}

nonisolated struct HealthComponent: Codable, Sendable, Hashable {
    let key: String
    let label: String
    let value: String
    let changeSinceLastWeek: String
    let direction: HealthDirection
}

nonisolated struct Health: Codable, Sendable, Hashable {
    let initiativeId: UUID
    let label: HealthLabel
    let changeSummary: String
    let components: [HealthComponent]
    let computedAt: Date
}

nonisolated struct Notice: Codable, Sendable, Hashable, Identifiable {
    let id: UUID
    let userId: String
    let kind: NoticeKind
    let refId: UUID
    let title: String
    let body: String
    let createdAt: Date
    let readAt: Date?
}

nonisolated struct TimelineEntry: Codable, Sendable, Hashable {
    let step: TimelineStep
    let at: Date
}

nonisolated struct MyRecordItem: Codable, Sendable, Hashable, Identifiable {
    let kind: RecordKind
    let id: UUID
    let text: String
    let initiativeId: UUID?
    let initiativeName: String?
    let resolutionClass: ResolutionClass?
    let othersCount: Int
    let outcome: RecordOutcome
    let routedTo: String?
    let answerId: UUID?
    let createdAt: Date
    let timeline: [TimelineEntry]
}

// Request bodies must write absent values as explicit `null`: the Zod schemas use `.nullable()`, which rejects
// a missing key. Synthesized Encodable omits nil optionals, so the two bodies the Mac sends encode by hand.

extension Flag {
    enum CodingKeys: String, CodingKey { case id, initiativeId, transcript, screenshotKey, clipKey, appNames, resolutionClass, createdAt }

    nonisolated func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(initiativeId, forKey: .initiativeId)
        try c.encode(transcript, forKey: .transcript)
        try c.encode(screenshotKey, forKey: .screenshotKey)
        try c.encode(clipKey, forKey: .clipKey)
        try c.encode(appNames, forKey: .appNames)
        try c.encode(resolutionClass, forKey: .resolutionClass)
        try c.encode(createdAt, forKey: .createdAt)
    }
}

extension Question {
    enum CodingKeys: String, CodingKey { case id, initiativeId, text, resolutionClass, createdAt }

    nonisolated func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(initiativeId, forKey: .initiativeId)
        try c.encode(text, forKey: .text)
        try c.encode(resolutionClass, forKey: .resolutionClass)
        try c.encode(createdAt, forKey: .createdAt)
    }
}
