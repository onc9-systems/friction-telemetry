import SwiftUI

/// Home (flow 11): my record, grouped by day, with a detail pane and the Ask composer pinned at the bottom.
struct HomeView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        HomePage()
            .inspector(isPresented: Binding(get: { model.selectedRecordId != nil }, set: { if !$0 { model.selectedRecordId = nil } })) {
                if let id = model.selectedRecordId, let item = model.record.first(where: { $0.id == id }) {
                    RecordDetailView(item: item)
                        .inspectorColumnWidth(min: 340, ideal: 420, max: 560)
                }
            }
    }
}

/// Home's page without the detail pane.
struct HomePage: View {
    @Environment(AppModel.self) private var model
    @State private var tab: Tab = .all
    @State private var composer = ""

    enum Tab: String, CaseIterable { case all = "All", waiting = "Waiting", fixed = "Fixed" }

    var body: some View {
        ZStack(alignment: .bottom) {
            PageScroll {
                Column {
                    VStack(alignment: .leading, spacing: 22) {
                        Text("Your record").font(.pageTitle).padding(.top, 28)
                        Picker("Show", selection: $tab) {
                            ForEach(Tab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        .labelsHidden()
                        .fixedSize()
                        if tab == .all, let notice = model.notices.first(where: { $0.kind == .fixRecorded }) {
                            FixNoticeCard(notice: notice)
                        }
                        list
                    }
                    .padding(.bottom, 110)
                }
            }
            AskComposer(text: $composer, placeholder: "Ask anything") {
                model.ask(composer)
                composer = ""
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 18)
            .frame(maxWidth: 820)
        }
    }

    private var items: [MyRecordItem] {
        switch tab {
        case .all: model.record
        case .waiting: model.record.filter { $0.outcome == .withOwner }
        case .fixed: model.record.filter { $0.outcome == .fixed }
        }
    }

    @ViewBuilder private var list: some View {
        if model.record.isEmpty {
            EmptyStateText(text: "Nothing here yet. Hold \(CaptureKeyDisplay.name) whenever something gets in your way, or ask a question in Ask.")
        } else if items.isEmpty {
            EmptyStateText(text: tab == .waiting ? "Nothing is waiting on an owner." : "Nothing fixed yet. When an owner fixes something you flagged or asked about, it shows here.")
        } else {
            let groups = Dictionary(grouping: items) { Calendar.current.startOfDay(for: $0.createdAt) }
            ForEach(groups.keys.sorted(by: >), id: \.self) { day in
                VStack(alignment: .leading, spacing: 4) {
                    Text(Format.dayHeader(day)).font(.subheadline.weight(.medium)).foregroundStyle(.secondary).padding(.bottom, 4)
                    ForEach(groups[day]!.sorted { $0.createdAt > $1.createdAt }) { item in
                        RecordRow(item: item, selected: model.selectedRecordId == item.id)
                            .onTapGesture { model.selectedRecordId = item.id }
                    }
                }
            }
        }
    }
}

struct RecordRow: View {
    @Environment(AppModel.self) private var model
    let item: MyRecordItem
    var selected = false

    var body: some View {
        let live = model.sessions[item.id]?.state
        let cls = live?.resolutionClass ?? item.resolutionClass
        HStack(alignment: .top, spacing: 14) {
            IconTile(symbol: item.kind == .flag ? "flag" : "questionmark.bubble")
            VStack(alignment: .leading, spacing: 5) {
                Text(item.text).font(.body.weight(.medium)).wraps()
                HStack(spacing: 8) {
                    if let name = item.initiativeName { Text(name).foregroundStyle(.secondary).wraps() }
                    if let cls { ClassPill(resolutionClass: cls) }
                    if let n = live?.othersCount ?? (item.othersCount > 0 ? item.othersCount : nil) {
                        Text("\(n) others").foregroundStyle(.secondary)
                    }
                }
                .font(.callout)
            }
            Spacer(minLength: 12)
            VStack(alignment: .trailing, spacing: 5) {
                Text(outcome(live)).font(.callout).foregroundStyle(.secondary)
                Text(Format.time(item.createdAt)).font(.caption).foregroundStyle(.tertiary)
            }
        }
        .padding(10)
        .background(selected ? Palette.card : .clear, in: .rect(cornerRadius: 12))
        .contentShape(Rectangle())
    }

    private func outcome(_ live: AnswerState?) -> String {
        guard let live else { return item.outcome.title }
        switch live.phase {
        case .waiting, .checking, .streaming: return "Answering"
        case .failed: return "Saved on this Mac"
        case .finished: return live.resolutionClass == .answered ? RecordOutcome.answered.title : RecordOutcome.withOwner.title
        }
    }
}

/// A fix notice, pinned on Home (flow 21): what changed, in the owner's words.
struct FixNoticeCard: View {
    let notice: Notice
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill").foregroundStyle(.green)
                    Text(notice.title).font(.headline).wraps()
                }
                Text(notice.body).wraps()
                HStack(spacing: 16) {
                    Button("See the corrected passage") {}.buttonStyle(.link).disabled(true)
                    Button("Still happening?") {}.buttonStyle(.bordered).disabled(true)
                }
            }
        }
    }
}

/// Granola's floating composer capsule.
struct AskComposer: View {
    @Binding var text: String
    let placeholder: String
    var onSubmit: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            TextField(placeholder, text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...6)
                .onSubmit(onSubmit)
            Button(action: onSubmit) { Image(systemName: "arrow.up.circle.fill").font(.title2) }
                .buttonStyle(.plain)
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .accessibilityLabel("Send")
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(.regularMaterial, in: .capsule)
        .overlay(Capsule().stroke(Palette.hairline))
        .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
    }
}
