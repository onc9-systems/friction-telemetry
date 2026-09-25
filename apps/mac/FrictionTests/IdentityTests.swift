import Foundation
import Testing
@testable import Friction

/// Each Mac acts as exactly one person from the fixed directory, and every request names that person.
/// Serialized: the chosen person lives in UserDefaults, shared by every test in the process and with the app
/// itself (tests run hosted in it), so each test puts back whoever this Mac was set to.
@MainActor
@Suite(.serialized)
final class IdentityTests {
    let directory: Directory
    private let saved = Identity.userId

    init() throws {
        directory = try Identity.bundledDirectory()
        Identity.userId = nil
    }

    deinit { Identity.userId = saved }

    private func model() throws -> AppModel { try AppModel(client: ShellClient(), directory: directory) }

    private func headerSent() -> String? {
        var request = URLRequest(url: URL(string: "https://api.test/v1/me")!)
        request.identify()
        return request.value(forHTTPHeaderField: "x-ft-user")
    }

    @Test func givenTheBundledDirectory_thenItIsExactlyAndresRominaAndAmirInAcme() {
        #expect(directory.organization == Organization(id: "org_acme", name: "Acme Logistics"))
        #expect(directory.people.map(\.id) == ["usr_andres", "usr_romina", "usr_amir"])
        #expect(directory.people.map(\.name) == ["Andrés Campos", "Romina", "Amir"])
        #expect(directory.people.map(\.leader) == [true, false, true])
    }

    @Test func givenAMacNeverSetToAnyone_whenTheAppLoads_thenItActsAsRominaWithoutLeaderPermission() throws {
        let m = try model()
        #expect(m.me.id == "usr_romina")
        #expect(m.isLeader == false)
        #expect(headerSent() == "usr_romina")
    }

    @Test func givenRomina_whenSwitchedToAmir_thenRequestsAreSentAsAmirAndHeSeesTheInitiativeSurface() throws {
        let m = try model()
        m.sentItems = [try #require(m.data.record.first)]
        m.switchPerson(to: "usr_amir")
        #expect(m.me.id == "usr_amir")
        #expect(m.isLeader == true)
        #expect(headerSent() == "usr_amir")
        #expect(m.sentItems.isEmpty)
    }

    @Test func givenAmirOnInsights_whenSwitchedToRomina_thenSheLandsOnHomeWithoutLeaderPermission() throws {
        Identity.userId = "usr_amir"
        let m = try model()
        m.selection = .insights
        m.switchPerson(to: "usr_romina")
        #expect(m.selection == .home)
        #expect(m.isLeader == false)
    }

    @Test func givenSomeoneOutsideTheDirectory_whenSwitchedTo_thenNothingChanges() throws {
        let m = try model()
        m.switchPerson(to: "usr_sam")
        #expect(m.me.id == "usr_romina")
        #expect(headerSent() == "usr_romina")
    }

    @Test func givenAMacSetToAndres_whenTheAppRelaunches_thenItIsStillAndres() throws {
        try model().switchPerson(to: "usr_andres")
        let relaunched = try model()
        #expect(relaunched.me.id == "usr_andres")
        #expect(relaunched.isLeader == true)
    }
}
