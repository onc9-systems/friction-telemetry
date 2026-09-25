import Foundation
import Observation

enum Surface: String, Hashable, CaseIterable {
    case home, ask, qa, initiatives, insights, health, settings, intake

    var title: String {
        switch self {
        case .intake: "Intake"
        case .home: "Home"
        case .ask: "Ask"
        case .qa: "Q&A"
        case .initiatives: "Initiatives"
        case .insights: "Insights"
        case .health: "Health"
        case .settings: "Settings"
        }
    }

    var symbol: String {
        switch self {
        case .home: "house"
        case .ask: "bubble.left"
        case .qa: "text.book.closed"
        case .initiatives: "flag.pattern.checkered"
        case .insights: "lightbulb"
        case .health: "waveform.path.ecg"
        case .settings: "gearshape"
        case .intake: "tray.and.arrow.up"
        }
    }

    static let worker: [Surface] = [.home, .ask, .qa]
    static let initiative: [Surface] = [.initiatives, .insights, .health]
    /// Internal: proves captures reach the cloud. Not a product surface.
    static let pipeline: [Surface] = [.intake]
}

/// One question and its answer in Ask.
struct AskTurn: Identifiable {
    let id: UUID
    let text: String
    let initiativeId: UUID
    let session: AnswerSession
}

/// App-wide state for the shell: sample data plus the Debug toggles that make every state reviewable.
@Observable
final class AppModel {
    let client: FrictionClient
    private(set) var data: SampleData
    private let loaded: SampleData
    /// The only people this Mac can act as (fixed-directory.json).
    let directory: Directory

    var selection: Surface = .home
    var selectedRecordId: UUID?
    var sentItems: [MyRecordItem] = []
    /// Answers streaming in this session, by Flag or Question id.
    var sessions: [UUID: AnswerSession] = [:]
    /// Finished answers built from stored data, cached so the card keeps its local state ("This didn't solve it").
    @ObservationIgnored private var storedSessions: [UUID: AnswerSession] = [:]
    var askTurns: [AskTurn] = []
    var askScope: UUID?

    /// The person's leader permission. Set from the directory on launch and on every switch; Debug can flip it.
    var isLeader: Bool
    var emptyData: Bool { didSet { UserDefaults.standard.set(emptyData, forKey: "debug.emptyData") } }
    var stubScript: StubScript { didSet { UserDefaults.standard.set(stubScript.rawValue, forKey: "debug.stubScript") } }

    init(client: FrictionClient, directory: Directory) throws {
        self.client = client
        self.directory = directory
        // A Mac that has not been set to anyone acts as the first person without leader permission.
        let chosen = directory.people.first { $0.id == Identity.userId }
            ?? directory.people.first { !$0.leader } ?? directory.people[0]
        Identity.userId = chosen.id
        var data = try client.sampleData()
        data.workspace = Self.workspace(directory, sample: data.workspace, signedIn: chosen.id)
        self.loaded = data
        self.data = data
        let defaults = UserDefaults.standard
        self.isLeader = chosen.leader
        self.emptyData = defaults.bool(forKey: "debug.emptyData")
        self.stubScript = StubScript(rawValue: defaults.string(forKey: "debug.stubScript") ?? "") ?? .answered
        self.askScope = liveInitiatives.first?.id
    }

    // MARK: People and initiatives

    /// The directory's organization and people, signed in as `signedIn`. Sample people stay so sample rows keep their names.
    private static func workspace(_ directory: Directory, sample: Workspace, signedIn: String) -> Workspace {
        let ids = Set(directory.people.map(\.id))
        return Workspace(organization: directory.organization,
                         people: directory.people + sample.people.filter { !ids.contains($0.id) },
                         signedInUserId: signedIn)
    }

    /// Act as another person from the directory. What this session sent as the previous person is cleared.
    func switchPerson(to id: String) {
        guard let person = directory.people.first(where: { $0.id == id }), person.id != me.id else { return }
        Identity.userId = person.id
        data.workspace = Self.workspace(directory, sample: data.workspace, signedIn: person.id)
        isLeader = person.leader
        sentItems = []
        sessions = [:]
        askTurns = []
        askScope = liveInitiatives.first?.id
        selectedRecordId = nil
        if !isLeader, Surface.initiative.contains(selection) { selection = .home }
    }

    var me: Person { data.workspace.people.first { $0.id == data.workspace.signedInUserId }! }
    var organization: Organization { data.workspace.organization }
    func person(_ id: String?) -> Person? { data.workspace.people.first { $0.id == id } }
    func initiative(_ id: UUID?) -> Initiative? { data.initiatives.first { $0.id == id } }

    /// Initiatives the signed-in person belongs to.
    var myInitiatives: [Initiative] {
        let mine = Set(data.members.filter { $0.userId == me.id }.map(\.initiativeId))
        return data.initiatives.filter { mine.contains($0.id) }
    }

    /// Live initiatives the person can ask about or flag against.
    var liveInitiatives: [Initiative] { myInitiatives.filter { $0.status == .live } }

    func owners(of initiativeId: UUID) -> [Person] {
        data.members.filter { $0.initiativeId == initiativeId && $0.role == .owner }.compactMap { person($0.userId) }
    }

    func affectedCount(of initiativeId: UUID) -> Int {
        data.members.filter { $0.initiativeId == initiativeId && $0.role == .affected }.count
    }

    func theses(of initiativeId: UUID) -> [Thesis] {
        data.theses.filter { $0.initiativeId == initiativeId }.sorted { $0.position < $1.position }
    }

    func documents(of initiativeId: UUID) -> [FrictionDocument] { data.documents.filter { $0.initiativeId == initiativeId } }

    func latestVersion(of documentId: UUID) -> DocumentVersion? {
        data.versions.filter { $0.documentId == documentId }.max { $0.createdAt < $1.createdAt }
    }

    func health(of initiativeId: UUID) -> Health? { data.health.first { $0.initiativeId == initiativeId } }

    func addLocalInitiative(_ initiative: Initiative, theses: [Thesis]) {
        data.initiatives.insert(initiative, at: 0)
        data.theses.append(contentsOf: theses)
        data.members.append(InitiativeMember(initiativeId: initiative.id, userId: me.id, role: .leader))
    }

    func closeInitiative(_ id: UUID) {
        guard let i = data.initiatives.firstIndex(where: { $0.id == id }) else { return }
        let old = data.initiatives[i]
        data.initiatives[i] = Initiative(id: old.id, organizationId: old.organizationId, name: old.name, whatIsChanging: old.whatIsChanging,
                                         why: old.why, status: .closed, targetDate: old.targetDate, createdAt: old.createdAt, closedAt: .now)
    }

    // MARK: Worker record

    /// Home rows: what this session sent, then the sample record. Empty when the Debug toggle says so.
    var record: [MyRecordItem] { emptyData ? [] : sentItems + data.record }
    var notices: [Notice] { emptyData ? [] : data.notices }

    func answer(_ id: UUID?) -> Answer? { data.answers.first { $0.id == id } }
    func flag(_ id: UUID) -> Flag? { data.flags.first { $0.id == id } }

    /// The answer card for a Home item: the live session if it was sent now, else the stored answer.
    func answerSession(for item: MyRecordItem) -> AnswerSession? {
        if let live = sessions[item.id] { return live }
        if let stored = storedSessions[item.id] { return stored }
        guard let answer = answer(item.answerId) else { return nil }
        let state = AnswerState(finished: answer, initiativeName: item.initiativeName, resolutionClass: item.resolutionClass, othersCount: item.othersCount)
        let session = AnswerSession(finished: state, id: item.id)
        storedSessions[item.id] = session
        return session
    }

    /// Send from the capture review panel: a new Home item streams the stub answer from the local Worker.
    func sendFlag(transcript: String, initiativeId: UUID, appNames: [String], hasScreenshot: Bool, hasClip: Bool) {
        let id = UUID()
        let flag = Flag(id: id, initiativeId: initiativeId, transcript: transcript,
                        screenshotKey: hasScreenshot ? "flags/\(organization.id)/\(id.uuidString.lowercased())/screenshot.png" : nil,
                        clipKey: hasClip ? "flags/\(organization.id)/\(id.uuidString.lowercased())/clip.mp4" : nil,
                        appNames: appNames, resolutionClass: nil, createdAt: .now)
        data.flags.insert(flag, at: 0)
        let item = MyRecordItem(kind: .flag, id: id, text: transcript, initiativeId: initiativeId, initiativeName: initiative(initiativeId)?.name,
                                resolutionClass: nil, othersCount: 0, outcome: .withOwner, routedTo: nil, answerId: nil,
                                createdAt: .now, timeline: [TimelineEntry(step: .sent, at: .now)])
        sentItems.insert(item, at: 0)
        let session = AnswerSession(id: id)
        sessions[id] = session
        session.start(body: .flag(flag), script: stubScript, client: client)
        selection = .home
        selectedRecordId = id
    }

    /// Send from Ask (or from Home's composer, which opens Ask).
    func ask(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, let scope = askScope ?? liveInitiatives.first?.id else { return }
        let question = Question(id: UUID(), initiativeId: scope, text: trimmed, resolutionClass: nil, createdAt: .now)
        let session = AnswerSession(id: question.id)
        askTurns.append(AskTurn(id: question.id, text: trimmed, initiativeId: scope, session: session))
        session.start(body: .question(question), script: stubScript, client: client)
        selection = .ask
    }
}
