import SwiftUI

/// Granola-style single sidebar: worker section for everyone, initiative section for leaders,
/// small icon buttons and the organization row at the bottom.
struct MainView: View {
    @Environment(AppModel.self) private var model
    @State private var columns: NavigationSplitViewVisibility = .all

    var body: some View {
        @Bindable var model = model
        NavigationSplitView(columnVisibility: $columns) {
            Sidebar()
                .navigationSplitViewColumnWidth(min: 200, ideal: 230, max: 300)
        } detail: {
            detail
                .toolbar {
                    ToolbarItem(placement: .navigation) {
                        Button {} label: { Image(systemName: "magnifyingglass") }
                            .help("Search")
                            .disabled(true)
                    }
                }
        }
        .frame(minWidth: 760, minHeight: 480)
    }

    @ViewBuilder private var detail: some View {
        switch model.selection {
        case .home: HomeView()
        case .ask: AskView()
        case .qa: QAView()
        case .initiatives: InitiativesView()
        case .insights: InsightsView()
        case .health: HealthView()
        case .settings: SettingsView()
        }
    }
}

struct Sidebar: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        VStack(spacing: 0) {
            List(selection: Binding(get: { model.selection }, set: { if let s = $0 { model.selection = s } })) {
                Section {
                    ForEach(Surface.worker, id: \.self) { s in Label(s.title, systemImage: s.symbol).tag(s) }
                }
                if model.isLeader {
                    Section("Initiatives") {
                        ForEach(Surface.initiative, id: \.self) { s in Label(s.title, systemImage: s.symbol).tag(s) }
                    }
                }
            }
            .listStyle(.sidebar)
            footer
        }
    }

    private var footer: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 14) {
                Button { model.selection = .settings } label: { Image(systemName: "gearshape") }
                    .help("Settings")
                Button {} label: { Image(systemName: "questionmark.circle") }
                    .help("Help")
                    .disabled(true)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 16)
            Divider()
            HStack(spacing: 8) {
                Image(systemName: "building.2").frame(width: 22, height: 22).background(Palette.card, in: .rect(cornerRadius: 6))
                Text(model.organization.name).font(.callout.weight(.medium)).wraps()
                Spacer(minLength: 4)
                Avatar(name: model.me.name).help(model.me.name)
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
    }
}
