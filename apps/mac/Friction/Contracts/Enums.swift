import Foundation

// Codable mirrors of packages/contracts/src/enums.ts. Raw values are the wire values exactly;
// the drift test decodes the shared fixtures, so a renamed case fails there.

nonisolated enum InitiativeStatus: String, Codable, Sendable, CaseIterable { case draft, live, closed }
nonisolated enum ThesisVerdict: String, Codable, Sendable, CaseIterable { case holding, breaking, noEvidence = "no_evidence" }
nonisolated enum MemberRole: String, Codable, Sendable, CaseIterable { case affected, owner, leader }
nonisolated enum DocumentVersionStatus: String, Codable, Sendable, CaseIterable { case uploading, extracting, indexing, ready, failed }
nonisolated enum ResolutionClass: String, Codable, Sendable, CaseIterable { case answered, unanswerable, stillStuck = "still_stuck" }
nonisolated enum QAEntryStatus: String, Codable, Sendable, CaseIterable { case draft, published, needsReapproval = "needs_reapproval" }
nonisolated enum NoticeKind: String, Codable, Sendable, CaseIterable { case fixRecorded = "fix_recorded", qaPublished = "qa_published" }
nonisolated enum HealthLabel: String, Codable, Sendable, CaseIterable { case healthy, atRisk = "at_risk", breaking }
nonisolated enum HealthDirection: String, Codable, Sendable, CaseIterable { case up, down, flat }
nonisolated enum ThesisRelation: String, Codable, Sendable, CaseIterable { case supports, breaks }
nonisolated enum RecordKind: String, Codable, Sendable, CaseIterable { case flag, question }
nonisolated enum RecordOutcome: String, Codable, Sendable, CaseIterable { case answered, withOwner = "with_owner", fixed }
nonisolated enum TimelineStep: String, Codable, Sendable, CaseIterable { case sent, answered, routed, qaPublished = "qa_published", fixed }
