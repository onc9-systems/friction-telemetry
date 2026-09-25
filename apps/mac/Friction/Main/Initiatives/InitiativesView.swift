import SwiftUI

/// Initiatives (flows 3, 3a, 4, 5): a Linear-style list with a detail page and a "New initiative" sheet.
struct InitiativesView: View {
    @Environment(AppModel.self) private var model
    @State private var selected: UUID?
    @State private var creating = false

    var body: some View {
        Group {
            if let id = selected, let initiative = model.initiative(id) {
                InitiativeDetailView(initiative: initiative, onBack: { selected = nil })
            } else {
                list
            }
        }
        .sheet(isPresented: $creating) { NewInitiativeSheet() }
    }

    private var list: some View {
        PageScroll {
            Column(maxWidth: 980) {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("Initiatives").font(.pageTitle)
                        Spacer()
                        Button { creating = true } label: { Label("New initiative", systemImage: "plus") }
                            .buttonStyle(.bordered)
                            .clipShape(.capsule)
                    }
                    .padding(.top, 28)
                    header
                    ForEach(model.data.initiatives) { initiative in
                        InitiativeRow(initiative: initiative)
                            .contentShape(Rectangle())
                            .onTapGesture { selected = initiative.id }
                        Divider()
                    }
                }
                .padding(.bottom, 32)
            }
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            Text("Name").frame(maxWidth: .infinity, alignment: .leading)
            Text("Status").frame(width: 70, alignment: .leading)
            Text("Owner").frame(width: 130, alignment: .leading)
            Text("Affected").frame(width: 70, alignment: .leading)
            Text("Documents").frame(width: 100, alignment: .leading)
            Text("Target").frame(width: 90, alignment: .leading)
            Text("Health").frame(width: 70, alignment: .leading)
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(.secondary)
    }
}

struct InitiativeRow: View {
    @Environment(AppModel.self) private var model
    let initiative: Initiative

    var body: some View {
        let docs = model.documents(of: initiative.id)
        let ready = docs.filter { model.latestVersion(of: $0.id)?.status == .ready }.count
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(initiative.name).font(.body.weight(.medium)).wraps().frame(maxWidth: .infinity, alignment: .leading)
            Pill(text: initiative.status.title, color: initiative.status.color).frame(width: 70, alignment: .leading)
            Text(model.owners(of: initiative.id).map(\.name).joined(separator: ", ")).wraps().frame(width: 130, alignment: .leading)
            Text("\(model.affectedCount(of: initiative.id))").frame(width: 70, alignment: .leading)
            Text("\(ready) of \(docs.count) ready").frame(width: 100, alignment: .leading)
            Text(initiative.targetDate.map(Format.calendarDay) ?? "None").frame(width: 90, alignment: .leading)
            Group {
                if let h = model.health(of: initiative.id) { Text(h.label.title).foregroundStyle(h.label.color) } else { Text("None").foregroundStyle(.secondary) }
            }
            .frame(width: 70, alignment: .leading)
        }
        .font(.callout)
        .padding(.vertical, 6)
    }
}

struct InitiativeDetailView: View {
    @Environment(AppModel.self) private var model
    let initiative: Initiative
    var onBack: () -> Void
    @State private var confirmingClose = false

    var body: some View {
        PageScroll {
            Column(maxWidth: 860) {
                VStack(alignment: .leading, spacing: 22) {
                    Button(action: onBack) { Label("Initiatives", systemImage: "chevron.left") }.buttonStyle(.link).padding(.top, 20)
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text(initiative.name).font(.pageTitle).wraps()
                        Pill(text: initiative.status.title, color: initiative.status.color)
                    }
                    FlowLayout(spacing: 8) {
                        Chip(text: "Owner: " + model.owners(of: initiative.id).map(\.name).joined(separator: ", "), symbol: "person")
                        Chip(text: "Affected: \(Format.people(model.affectedCount(of: initiative.id)))", symbol: "person.3")
                        Chip(text: "Target: " + (initiative.targetDate.map(Format.calendarDay) ?? "None"), symbol: "calendar")
                    }
                    section("What is changing") { Text(initiative.whatIsChanging).wraps() }
                    section("Why") { Text(initiative.why).wraps() }
                    section("Theses") {
                        ForEach(model.theses(of: initiative.id)) { t in
                            HStack(alignment: .firstTextBaseline, spacing: 10) {
                                Text(t.statement).wraps()
                                Spacer(minLength: 8)
                                Pill(text: t.verdict.title, color: t.verdict.color)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    section("Documents") {
                        ForEach(model.documents(of: initiative.id)) { d in
                            let v = model.latestVersion(of: d.id)
                            HStack(alignment: .firstTextBaseline, spacing: 10) {
                                Image(systemName: "doc.text").foregroundStyle(.secondary)
                                Text(d.title).wraps()
                                if d.suspect { Pill(text: "Marked suspect", color: .orange) }
                                Spacer(minLength: 8)
                                if let v {
                                    Text(v.status == .ready ? "Ready (\(v.passageCount ?? 0) passages)" : v.status == .failed ? "Failed: \(v.failureReason ?? "couldn't read this file")" : v.status.title)
                                        .foregroundStyle(v.status == .failed ? .red : .secondary).wraps()
                                }
                                Button("Replace") {}.disabled(true)
                                Button("Remove") {}.disabled(true)
                            }
                            .font(.callout)
                            .padding(.vertical, 3)
                        }
                    }
                    section("Affected people") { peopleList(.affected) }
                    section("Owners") { peopleList(.owner) }
                    if initiative.status != .closed {
                        Button("Close initiative", role: .destructive) { confirmingClose = true }
                            .confirmationDialog("Close \(initiative.name)?", isPresented: $confirmingClose) {
                                Button("Close initiative", role: .destructive) { model.closeInitiative(initiative.id) }
                            } message: {
                                Text("Chat and flagging for this initiative will stop. Its evidence and insights stay readable.")
                            }
                    }
                }
                .padding(.bottom, 32)
            }
        }
    }

    private func peopleList(_ role: MemberRole) -> some View {
        let people = model.data.members.filter { $0.initiativeId == initiative.id && $0.role == role }.compactMap { model.person($0.userId) }
        return FlowLayout(spacing: 8) {
            ForEach(people) { p in
                HStack(spacing: 6) { Avatar(name: p.name); Text(p.name) }
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Palette.card, in: .capsule)
            }
        }
    }

    private func section<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
