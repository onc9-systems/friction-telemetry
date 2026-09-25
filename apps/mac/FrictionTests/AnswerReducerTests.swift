import Foundation
import Testing
@testable import Friction

/// The answer card is built only from stream events. These pin the three rules the spec names.
struct AnswerReducerTests {
    let initiative = UUID()

    func run(_ events: [SSEEvent], from start: AnswerState = AnswerReducer.reduce(AnswerState(), .started)) -> [AnswerState] {
        var states = [start]
        for e in events { states.append(AnswerReducer.reduce(states.last!, .event(e))) }
        return states
    }

    func script(_ name: String) throws -> [SSEEvent] {
        let url = SampleData.bundledDirectory.appending(path: name)
        let steps = try JSONDecoder.contract.decode([ScriptStep].self, from: Data(contentsOf: url))
        return try steps.map { try SSEEvent(name: $0.event, data: JSONEncoder().encode($0.data)) }
    }

    @Test func givenTheAnsweredScript_thenNoStateShowsAClassBeforeTheClassEvent() throws {
        let events = try script("stub-answered.json")
        let classIndex = try #require(events.firstIndex { if case .resolutionClass = $0 { true } else { false } })
        let states = run(events)
        for (i, s) in states.enumerated() where i <= classIndex {
            #expect(s.resolutionClass == nil, "state \(i) showed a class before the class event")
        }
        #expect(states.last?.resolutionClass == .answered)
        #expect(states.last?.phase == .finished)
        #expect(states.last?.citations.map(\.index) == [1, 2])
        #expect(states.last?.othersCount == 23)
    }

    @Test func givenAProvisionalLineThenAnAnswer_thenTheProvisionalLineStaysAndTheUpdateNoteAppears() {
        let final = run([
            .provisional(.init(message: "Probably not covered in the docs. Sent to the owner. Still checking.")),
            .delta(.init(text: "The docs do cover it.")),
            .resolutionClass(.init(resolutionClass: .answered)),
            .done(.init(answerId: UUID())),
        ]).last!
        #expect(final.provisionalMessage == "Probably not covered in the docs. Sent to the owner. Still checking.")
        #expect(final.showsUpdateNote)
        #expect(final.text == "The docs do cover it.")
    }

    @Test func givenTheProvisionalRoutedScript_thenTheClassIsSentToOwnerWithNoUpdateNote() throws {
        let final = run(try script("stub-provisional-routed.json")).last!
        #expect(final.resolutionClass == .unanswerable)
        #expect(final.provisionalMessage != nil)
        #expect(final.showsUpdateNote == false)
        #expect(final.citations.isEmpty)
    }

    @Test func givenADoneEventWithoutAClassEvent_thenTheClassStaysUnset() {
        let final = run([.delta(.init(text: "Hi")), .done(.init(answerId: UUID()))]).last!
        #expect(final.phase == .finished)
        #expect(final.resolutionClass == nil)
    }

    @Test func givenATransportFailureMidStream_thenTheCardShowsTheSavedOnThisMacError() {
        let mid = run([.delta(.init(text: "Partial"))]).last!
        let failed = AnswerReducer.reduce(mid, .transportFailed)
        #expect(failed.phase == .failed)
        #expect(failed.failure == "Couldn't reach Friction. Your flag is saved on this Mac and will send when the connection returns.")
    }

    @Test func givenAFinishedAnswer_whenMarkedStillStuck_thenTheClassFlipsLocally() {
        let answered = run([.resolutionClass(.init(resolutionClass: .answered)), .done(.init(answerId: UUID()))]).last!
        let stuck = AnswerReducer.reduce(answered, .markStillStuck)
        #expect(stuck.resolutionClass == .stillStuck)
        #expect(stuck.markedStillStuck)
    }
}
