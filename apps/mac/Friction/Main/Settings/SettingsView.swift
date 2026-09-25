import SwiftUI

/// Placeholder settings. Every row is inert in the shell; phases 02 to 04 make them real.
struct SettingsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        PageScroll {
            Column(maxWidth: 640) {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Settings").font(.pageTitle).padding(.top, 28)
                    Card {
                        VStack(alignment: .leading, spacing: 0) {
                            row("Capture key", "Hold \(CaptureKeyDisplay.name) to flag. You can change it once setup is built.")
                            Divider().padding(.vertical, 12)
                            row("Screen context", "Keep the last few seconds of your screen on this Mac so a flag can show what happened.")
                            Divider().padding(.vertical, 12)
                            person
                        }
                    }
                }
            }
        }
    }

    /// Who this Mac acts as. Everything it sends is sent as this person.
    private var person: some View {
        VStack(alignment: .leading, spacing: 8) {
            row("Using Friction as", "Everything this Mac sends goes to \(model.organization.name) as this person.")
            ForEach(model.directory.people) { p in
                let chosen = p.id == model.me.id
                Button { model.switchPerson(to: p.id) } label: {
                    HStack(spacing: 8) {
                        Image(systemName: chosen ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(chosen ? Color.accentColor : .secondary)
                        Text("\(p.name), \(p.roleLabel)").wraps()
                    }
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(chosen ? .isSelected : [])
            }
        }
    }

    private func row(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.headline)
            Text(detail).foregroundStyle(.secondary).wraps()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
