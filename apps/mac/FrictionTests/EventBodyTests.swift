import Foundation
import Testing
@testable import Friction

/// The bodies the Mac posts must match the Zod contract, where nullable fields are present as `null`.
struct EventBodyTests {
    func object(_ body: EventBody) throws -> [String: Any] {
        try #require(JSONSerialization.jsonObject(with: body.encoded()) as? [String: Any])
    }

    @Test func givenAFlagWithNoInitiativeOrFiles_whenEncoded_thenEveryNullableKeyIsPresentAsNull() throws {
        let flag = Flag(id: UUID(), initiativeId: nil, transcript: "It says call finance", screenshotKey: nil, clipKey: nil,
                        appNames: [], resolutionClass: nil, createdAt: Date(timeIntervalSince1970: 1_790_000_000.25))
        let json = try object(.flag(flag))
        #expect(Set(json.keys) == ["id", "initiativeId", "transcript", "screenshotKey", "clipKey", "appNames", "resolutionClass", "createdAt"])
        for key in ["initiativeId", "screenshotKey", "clipKey", "resolutionClass"] {
            #expect(json[key] is NSNull, "\(key) must be null, not missing")
        }
        #expect(json["createdAt"] as? String == "2026-09-21T14:13:20.250Z")
    }

    @Test func givenAQuestion_whenEncoded_thenResolutionClassIsPresentAsNull() throws {
        let q = Question(id: UUID(), initiativeId: UUID(), text: "Who approves?", resolutionClass: nil, createdAt: .now)
        let json = try object(.question(q))
        #expect(Set(json.keys) == ["id", "initiativeId", "text", "resolutionClass", "createdAt"])
        #expect(json["resolutionClass"] is NSNull)
    }
}
