import SwiftUI

/// Q&A (flow 10): owner-approved answers, one section per initiative the person belongs to.
/// In the shell, search filters locally; phase 07 runs it through the answer pipeline. No votes, no comments.
struct QAView: View {
    @Environment(AppModel.self) private var model
    @State private var query = ""
    @State private var expanded: Set<UUID> = []

    var body: some View {
        PageScroll {
            Column {
                VStack(alignment: .leading, spacing: 22) {
                    Text("Q&A").font(.pageTitle).padding(.top, 28)
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                        TextField("Search or ask", text: $query).textFieldStyle(.plain)
                    }
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(Palette.card, in: .capsule)
                    .overlay(Capsule().stroke(Palette.hairline))
                    let sections = model.myInitiatives.filter { $0.status != .draft }.compactMap { i -> (Initiative, [QAEntry])? in
                        let entries = matching(model.data.qaEntries.filter { $0.initiativeId == i.id && $0.status == .published })
                        return entries.isEmpty ? nil : (i, entries)
                    }
                    if sections.isEmpty {
                        EmptyStateText(text: query.isEmpty ? "No answers published yet." : "Nothing in Q&A matches \"\(query)\".")
                    }
                    ForEach(sections, id: \.0.id) { initiative, entries in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(initiative.name).font(.title3.weight(.semibold))
                            ForEach(entries) { entry in entryView(entry) }
                        }
                    }
                }
                .padding(.bottom, 32)
            }
        }
    }

    private func matching(_ entries: [QAEntry]) -> [QAEntry] {
        let q = query.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return entries }
        return entries.filter { $0.question.localizedCaseInsensitiveContains(q) || ($0.answer ?? "").localizedCaseInsensitiveContains(q) }
    }

    private func entryView(_ entry: QAEntry) -> some View {
        let isOpen = expanded.contains(entry.id)
        return Card(padding: 14) {
            VStack(alignment: .leading, spacing: 10) {
                Button {
                    if isOpen { expanded.remove(entry.id) } else { expanded.insert(entry.id) }
                } label: {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: isOpen ? "chevron.down" : "chevron.right").foregroundStyle(.secondary).frame(width: 12)
                        Text(entry.question).font(.body.weight(.medium)).multilineTextAlignment(.leading).wraps()
                        Spacer(minLength: 0)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                if isOpen {
                    if let answer = entry.answer { Text(answer).textSelection(.enabled).wraps().padding(.leading, 22) }
                    HStack(spacing: 14) {
                        if let by = model.person(entry.approvedByUserId), let at = entry.approvedAt {
                            Text("Approved by \(by.name), \(Format.dayMonth(at))")
                        }
                        Text("Asked by \(Format.people(entry.askedCount))")
                        if entry.askedByMe { Text("You asked this").fontWeight(.medium) }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.leading, 22)
                }
            }
        }
    }
}
