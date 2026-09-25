import SwiftUI

/// Detail for one Home item: exactly what was sent, the answer as it finished, and the timeline.
struct RecordDetailView: View {
    @Environment(AppModel.self) private var model
    let item: MyRecordItem

    var body: some View {
        PageScroll {
            VStack(alignment: .leading, spacing: 20) {
                sent
                if let session = model.answerSession(for: item) {
                    section("Answer") { AnswerCardView(session: session, routedTo: item.routedTo) }
                }
                section("Timeline") { timeline }
            }
            .padding(20)
        }
    }

    @ViewBuilder private var sent: some View {
        section(item.kind == .flag ? "What you sent" : "What you asked") {
            VStack(alignment: .leading, spacing: 12) {
                Text(item.text).textSelection(.enabled).wraps()
                if item.kind == .flag, let flag = model.flag(item.id) {
                    if flag.screenshotKey != nil { RedactedThumbnail(boxes: [], width: 220) }
                    if !flag.appNames.isEmpty {
                        FlowLayout { ForEach(flag.appNames, id: \.self) { Chip(text: $0) } }
                    }
                }
                if let name = item.initiativeName { Chip(text: name, symbol: "flag.pattern.checkered") }
            }
        }
    }

    private var timeline: some View {
        let entries = item.timeline + (model.sessions[item.id]?.state.phase == .finished && item.timeline.count == 1
            ? [TimelineEntry(step: model.sessions[item.id]?.state.resolutionClass == .answered ? .answered : .routed, at: .now)] : [])
        return VStack(alignment: .leading, spacing: 10) {
            ForEach(Array(entries.enumerated()), id: \.offset) { _, e in
                HStack(spacing: 10) {
                    Circle().fill(e.step == .fixed ? Color.green : Color.accentColor).frame(width: 8, height: 8)
                    Text(e.step.title).font(.callout.weight(.medium))
                    Text("\(Format.dayMonth(e.at)), \(Format.time(e.at))").font(.callout).foregroundStyle(.secondary)
                }
            }
        }
    }

    private func section<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(.secondary).textCase(.uppercase)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
