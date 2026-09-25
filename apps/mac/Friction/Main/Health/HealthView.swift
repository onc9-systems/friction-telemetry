import SwiftUI

/// Health (flow 16): a word, what changed, and every component with its change and direction.
/// Never a bare number, never a gauge or donut.
struct HealthView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        PageScroll {
            Column(maxWidth: 860) {
                VStack(alignment: .leading, spacing: 22) {
                    Text("Health").font(.pageTitle).padding(.top, 28)
                    ForEach(model.data.initiatives.filter { $0.status == .live }) { initiative in
                        if let health = model.health(of: initiative.id) { card(initiative, health) }
                    }
                }
                .padding(.bottom, 32)
            }
        }
    }

    private func card(_ initiative: Initiative, _ health: Health) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(initiative.name).font(.title3.weight(.semibold)).wraps()
                    Spacer(minLength: 8)
                    Text(health.label.title).font(.title3.weight(.semibold)).foregroundStyle(health.label.color)
                }
                Text(health.changeSummary).foregroundStyle(.secondary).wraps()
                Divider()
                ForEach(health.components, id: \.key) { c in
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text(c.label).font(.callout.weight(.medium)).frame(width: 190, alignment: .leading).wraps()
                        Text(c.value).font(.callout).wraps().frame(maxWidth: .infinity, alignment: .leading)
                        HStack(spacing: 4) {
                            Image(systemName: c.direction == .up ? "arrow.up.right" : c.direction == .down ? "arrow.down.right" : "arrow.right")
                            Text(c.changeSinceLastWeek).wraps()
                        }
                        .font(.callout)
                        .foregroundStyle(c.direction == .up ? .green : c.direction == .down ? .red : .secondary)
                        .frame(width: 200, alignment: .leading)
                        .accessibilityLabel("\(c.changeSinceLastWeek), pushed health \(c.direction == .up ? "up" : c.direction == .down ? "down" : "neither way")")
                        Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }
}
