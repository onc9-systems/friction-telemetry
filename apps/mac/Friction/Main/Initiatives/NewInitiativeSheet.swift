import SwiftUI
import UniformTypeIdentifiers

/// New initiative (flows 3, 3a). In the shell, dropped files step through upload and indexing on a timer,
/// and Publish adds the initiative to the local list only.
struct NewInitiativeSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var whatIsChanging = ""
    @State private var why = ""
    @State private var theses: [String] = [""]
    @State private var docs: [DraftDocument] = [.failedSample]
    @State private var targeted = false

    struct DraftDocument: Identifiable, Equatable {
        let id = UUID()
        var title: String
        var status: DocumentVersionStatus
        var progress: Int
        var passages: Int?
        var failure: String?

        static let failedSample = DraftDocument(title: "Rollout kickoff deck.pptx", status: .failed, progress: 0, passages: nil, failure: "Couldn't read this PPTX")

        var statusText: String {
            switch status {
            case .uploading: "Uploading \(progress)%"
            case .extracting: "Extracting"
            case .indexing: "Indexing"
            case .ready: "Ready (\(passages ?? 0) passages)"
            case .failed: "Failed: \(failure ?? "couldn't read this file")"
            }
        }
    }

    private var readyCount: Int { docs.filter { $0.status == .ready }.count }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    TextField("Initiative name", text: $name, axis: .vertical)
                        .font(.pageTitle)
                        .textFieldStyle(.plain)
                    FlowLayout(spacing: 8) {
                        Chip(text: "Owner", symbol: "person")
                        Chip(text: "Affected people", symbol: "person.3")
                        Chip(text: "Target date", symbol: "calendar")
                    }
                    field("What is changing", text: $whatIsChanging, prompt: "Purchase orders move from email to SAP Ariba.")
                    field("Why", text: $why, prompt: "Finance spends two days a month chasing approvals.")
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Theses").font(.headline)
                        ForEach(theses.indices, id: \.self) { i in
                            TextField("Buyers can raise a PO without calling finance.", text: $theses[i], axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                        }
                        Button { theses.append("") } label: { Label("Thesis", systemImage: "plus") }.buttonStyle(.link)
                    }
                    documents
                }
                .padding(24)
            }
            Divider()
            HStack {
                Text(publishReason ?? "").font(.callout).foregroundStyle(.secondary).wraps()
                Spacer()
                Button("Cancel") { dismiss() }.keyboardShortcut(.cancelAction)
                Button("Publish") { publish() }
                    .buttonStyle(.borderedProminent)
                    .disabled(publishReason != nil)
            }
            .padding(16)
        }
        .frame(width: 680, height: 720)
    }

    private var publishReason: String? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Needs a name" }
        if readyCount == 0 { return "Needs one ready document" }
        return nil
    }

    private var documents: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Documents").font(.headline)
                Spacer()
                Text("\(readyCount) of \(docs.count) ready").font(.callout).foregroundStyle(.secondary)
            }
            ForEach(docs) { d in
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Image(systemName: "doc.text").foregroundStyle(.secondary)
                    Text(d.title).wraps()
                    Spacer(minLength: 8)
                    Text(d.statusText).foregroundStyle(d.status == .failed ? .red : .secondary).wraps()
                    if d.status == .failed {
                        Button("Retry") { process(d.id) }
                        Button("Replace") {}.disabled(true)
                    }
                }
                .font(.callout)
            }
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [6]))
                .foregroundStyle(targeted ? Color.accentColor : Palette.hairline)
                .frame(height: 84)
                .overlay(Text("Drop PDF, Word, PowerPoint, or Excel files here").foregroundStyle(.secondary).wraps())
                .onDrop(of: [.fileURL], isTargeted: $targeted) { providers in
                    for p in providers {
                        _ = p.loadObject(ofClass: URL.self) { url, _ in
                            let title = url?.lastPathComponent ?? "Document"
                            Task { @MainActor in add(title) }
                        }
                    }
                    return true
                }
                .onTapGesture { add("Procurement Policy v3.pdf") }
        }
    }

    private func add(_ title: String) {
        let doc = DraftDocument(title: title, status: .uploading, progress: 0, passages: nil, failure: nil)
        docs.insert(doc, at: 0)
        process(doc.id)
    }

    /// Steps a draft document through Uploading 40%, Extracting, Indexing, Ready (212 passages).
    private func process(_ id: UUID) {
        Task { @MainActor in
            let steps: [(DocumentVersionStatus, Int, Int?)] = [(.uploading, 40, nil), (.uploading, 100, nil), (.extracting, 100, nil), (.indexing, 100, nil), (.ready, 100, 212)]
            for (status, progress, passages) in steps {
                guard let i = docs.firstIndex(where: { $0.id == id }) else { return }
                docs[i].status = status; docs[i].progress = progress; docs[i].passages = passages; docs[i].failure = nil
                try? await Task.sleep(for: .milliseconds(900))
            }
        }
    }

    private func publish() {
        let id = UUID()
        let initiative = Initiative(id: id, organizationId: model.organization.id, name: name, whatIsChanging: whatIsChanging, why: why,
                                    status: .live, targetDate: nil, createdAt: .now, closedAt: nil)
        let newTheses = theses.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }.enumerated().map {
            Thesis(id: UUID(), initiativeId: id, statement: $0.element, verdict: .noEvidence, position: $0.offset)
        }
        model.addLocalInitiative(initiative, theses: newTheses)
        dismiss()
    }

    private func field(_ title: String, text: Binding<String>, prompt: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.headline)
            TextField(prompt, text: text, axis: .vertical).textFieldStyle(.roundedBorder).lineLimit(2...6)
        }
    }
}
