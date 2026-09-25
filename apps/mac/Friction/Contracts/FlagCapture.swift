import Foundation

// Codable mirrors of packages/contracts/src/concepts/flag-capture.ts. Nullable fields encode as explicit
// null because Zod's `.nullable()` rejects a missing key.

nonisolated enum CapturePartKind: String, Codable, Sendable, CaseIterable { case video, audio }
nonisolated enum CapturePartStatus: String, Codable, Sendable, CaseIterable { case uploading, received }
nonisolated enum TranscriptStatus: String, Codable, Sendable, CaseIterable { case waiting, transcribing, done, failed }
nonisolated enum WindowEventReason: String, Codable, Sendable, CaseIterable { case activated, titleChanged = "title_changed" }

nonisolated struct WindowEvent: Codable, Sendable, Hashable {
    let at: Date
    let reason: WindowEventReason
    let appName: String
    let bundleId: String?
    let windowTitle: String?

    enum CodingKeys: String, CodingKey { case at, reason, appName, bundleId, windowTitle }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(at, forKey: .at)
        try c.encode(reason, forKey: .reason)
        try c.encode(appName, forKey: .appName)
        try c.encode(bundleId, forKey: .bundleId)
        try c.encode(windowTitle, forKey: .windowTitle)
    }
}

nonisolated struct CapturePartSpec: Codable, Sendable, Hashable {
    let kind: CapturePartKind
    let contentType: String
    let byteSize: Int
    let startedAt: Date
    let endedAt: Date
}

nonisolated struct ScreenSettings: Codable, Sendable, Hashable {
    let width: Int
    let height: Int
    let framesPerSecond: Double
}

nonisolated struct FlagCaptureManifest: Codable, Sendable, Hashable {
    let flagId: UUID
    let clickedAt: Date
    let sentAt: Date
    let parts: [CapturePartSpec]
    let screen: ScreenSettings?
    let windows: [WindowEvent]

    enum CodingKeys: String, CodingKey { case flagId, clickedAt, sentAt, parts, screen, windows }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(flagId, forKey: .flagId)
        try c.encode(clickedAt, forKey: .clickedAt)
        try c.encode(sentAt, forKey: .sentAt)
        try c.encode(parts, forKey: .parts)
        try c.encode(screen, forKey: .screen)
        try c.encode(windows, forKey: .windows)
    }
}

nonisolated struct CaptureUploadPlan: Codable, Sendable, Hashable {
    struct Part: Codable, Sendable, Hashable {
        let kind: CapturePartKind
        let uploadId: String
        let received: Bool
    }
    let flagId: UUID
    let partSize: Int
    let parts: [Part]
}

nonisolated struct UploadedPart: Codable, Sendable, Hashable {
    let partNumber: Int
    let etag: String
}

nonisolated struct TranscriptWord: Codable, Sendable, Hashable {
    let word: String
    let startedAt: Date
    let endedAt: Date
    let confidence: Double
}

nonisolated struct CapturePartState: Codable, Sendable, Hashable {
    let kind: CapturePartKind
    let contentType: String
    let byteSize: Int
    let startedAt: Date
    let endedAt: Date
    let status: CapturePartStatus
    let receivedAt: Date?
}

nonisolated struct FlagCaptureSummary: Codable, Sendable, Hashable, Identifiable {
    var id: UUID { flagId }
    let flagId: UUID
    let clickedAt: Date
    let sentAt: Date
    let registeredAt: Date
    let parts: [CapturePartState]
    let windowCount: Int
    let transcriptStatus: TranscriptStatus
    let transcript: String?
    let transcriptError: String?
}

nonisolated struct FlagCaptureDetail: Codable, Sendable, Hashable {
    let flagId: UUID
    let clickedAt: Date
    let sentAt: Date
    let registeredAt: Date
    let parts: [CapturePartState]
    let windowCount: Int
    let transcriptStatus: TranscriptStatus
    let transcript: String?
    let transcriptError: String?
    let screen: ScreenSettings?
    let windows: [WindowEvent]
    let words: [TranscriptWord]
}
