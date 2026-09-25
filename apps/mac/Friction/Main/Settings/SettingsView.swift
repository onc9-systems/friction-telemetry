import SwiftUI

/// Placeholder settings. Every row is inert in the shell; phases 02 to 04 make them real.
struct SettingsView: View {
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
                            row("Account", "Sign-in arrives with the workspace setup.")
                        }
                    }
                }
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
