import Foundation
import Testing
@testable import Friction

/// The Swift mirrors must decode the same fixtures the Zod schemas parse. A renamed property or enum case fails here.
@MainActor
struct ContractDriftTests {
    let dir = SampleData.bundledDirectory

    @Test func givenTheBundledFixtures_whenLoaded_thenEveryFileDecodesWithItsExpectedCounts() throws {
        let data = try SampleData.load(from: dir)
        #expect(data.workspace.organization.name == "Acme Logistics")
        #expect(data.workspace.people.count == 7)
        #expect(data.initiatives.map(\.status) == [.live, .live, .draft, .closed])
        #expect(data.theses.count == 8)
        #expect(data.record.count == 9)
        #expect(data.qaEntries.count == 6)
        #expect(data.insights.count == 5)
        #expect(data.insights.filter { !$0.evidenceVisible }.count == 1)
        #expect(data.health.map(\.label) == [.breaking, .atRisk])
        #expect(data.notices.map(\.kind) == [.fixRecorded])
    }

    @Test func givenTheRecordFixture_thenItCoversEveryClassAndEveryOutcome() throws {
        let data = try SampleData.load(from: dir)
        #expect(Set(data.record.compactMap(\.resolutionClass)) == Set(ResolutionClass.allCases))
        #expect(Set(data.record.map(\.outcome)) == Set(RecordOutcome.allCases))
    }

    @Test func givenBothStubScripts_whenEveryStepIsDecodedAsAnSSEEvent_thenNoneThrows() throws {
        for name in ["stub-answered.json", "stub-provisional-routed.json"] {
            let steps = try JSONDecoder.contract.decode([ScriptStep].self, from: Data(contentsOf: dir.appending(path: name)))
            #expect(!steps.isEmpty)
            for step in steps {
                _ = try SSEEvent(name: step.event, data: JSONEncoder().encode(step.data))
            }
        }
    }

    @Test func givenAMisspelledClass_whenDecoded_thenDecodingFails() throws {
        let json = #"{"resolutionClass":"answerd"}"#
        struct Probe: Decodable { let resolutionClass: ResolutionClass }
        #expect(throws: DecodingError.self) { try JSONDecoder.contract.decode(Probe.self, from: Data(json.utf8)) }
    }

    @Test func givenLoadingOnADayAfterTheAnchor_thenTheNewestItemLandsOnThatDay() throws {
        let cal = Calendar(identifier: .gregorian)
        let now = cal.date(from: DateComponents(timeZone: .current, year: 2026, month: 10, day: 3, hour: 12))!
        let data = try SampleData.load(from: dir, now: now, calendar: cal)
        let newest = data.record.map(\.createdAt).max()!
        #expect(cal.isDate(newest, inSameDayAs: now))
    }
}
