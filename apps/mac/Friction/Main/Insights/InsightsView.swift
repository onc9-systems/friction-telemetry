import SwiftUI

/// Insights (flows 14, 17, 20): grouped by thesis, with an evidence panel.
/// "Record fix" and "Assign owner" are present and inert in the shell.
struct InsightsView: View {
    @Environment(AppModel.self) private var model
    @State private var initiativeId: UUID?
    @State private var selected: UUID?

    var body: some View {
        InsightsPage(initiativeId: $initiativeId, selected: $selected)
            .inspector(isPresented: Binding(get: { selected != nil }, set: { if !$0 { selected = nil } })) {
                if let id = selected, let insight = model.data.insights.first(where: { $0.id == id }) {
                    InsightEvidenceView(insight: insight).inspectorColumnWidth(min: 340, ideal: 420, max: 560)
                }
            }
    }
}

struct InsightsPage: View {
    @Environment(AppModel.self) private var model
    @Binding var initiativeId: UUID?
    @Binding var selected: UUID?

    var body: some View {
        let live = model.data.initiatives.filter { $0.status == .live }
        let current = initiativeId ?? live.first?.id
        PageScroll {
            Column(maxWidth: 900) {
                VStack(alignment: .leading, spacing: 22) {
                    HStack(alignment: .firstTextBaseline) {
                        Text("Insights").font(.pageTitle)
                        Spacer()
                        Picker("Initiative", selection: Binding(get: { current }, set: { initiativeId = $0 })) {
                            ForEach(live) { Text($0.name).tag(Optional($0.id)) }
                        }
                        .labelsHidden()
                        .fixedSize()
                    }
                    .padding(.top, 28)
                    if let current {
                        ForEach(model.theses(of: current)) { thesis in thesisSection(thesis) }
                    }
                }
                .padding(.bottom, 32)
            }
        }
    }

    private func thesisSection(_ thesis: Thesis) -> some View {
        let insights = model.data.insights.filter { $0.thesisLinks.contains { $0.thesisId == thesis.id } }
        let evidence = insights.reduce(0) { $0 + $1.classSplit.answered + $1.classSplit.unanswerable + $1.classSplit.stillStuck }
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(thesis.statement).font(.title3.weight(.semibold)).wraps()
                Pill(text: thesis.verdict.title, color: thesis.verdict.color)
                Spacer(minLength: 8)
                Text(evidence == 1 ? "1 report" : "\(evidence) reports").foregroundStyle(.secondary)
            }
            if insights.isEmpty {
                Text("No insights yet for this thesis.").foregroundStyle(.secondary).padding(.vertical, 6)
            }
            ForEach(insights) { insight in
                InsightRow(insight: insight, selected: selected == insight.id)
                    .contentShape(Rectangle())
                    .onTapGesture { selected = insight.id }
            }
        }
    }
}

struct InsightRow: View {
    @Environment(AppModel.self) private var model
    let insight: Insight
    var selected = false

    var body: some View {
        let fix = model.data.fixes.first { $0.id == insight.fixId }
        VStack(alignment: .leading, spacing: 10) {
            Text(insight.title).font(.body.weight(.medium)).wraps()
            HStack(alignment: .center, spacing: 16) {
                ClassSplitBar(split: insight.classSplit).frame(maxWidth: 320)
                Sparkline(values: model.data.evidence.first { $0.insightId == insight.id }?.weeklyCounts ?? [])
                    .frame(width: 80, height: 22)
                Spacer(minLength: 8)
                if let owner = model.person(insight.ownerUserId) {
                    HStack(spacing: 6) { Avatar(name: owner.name, size: 20); Text(owner.name) }.font(.callout)
                } else {
                    Button("Assign owner") {}.disabled(true)
                }
                Text(fix.map { "Fixed \(Format.dayMonth($0.recordedAt))" } ?? "No fix yet")
                    .font(.callout).foregroundStyle(fix == nil ? Color.secondary : .green)
            }
        }
        .padding(14)
        .background(selected ? Palette.card : Color.clear, in: .rect(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.hairline))
    }
}

/// Answered, Unanswerable, Still stuck, as one bar with counts.
struct ClassSplitBar: View {
    let split: ClassSplit
    var body: some View {
        let parts: [(ResolutionClass, Int)] = [(.answered, split.answered), (.unanswerable, split.unanswerable), (.stillStuck, split.stillStuck)]
        let total = max(1, parts.reduce(0) { $0 + $1.1 })
        VStack(alignment: .leading, spacing: 4) {
            GeometryReader { geo in
                HStack(spacing: 2) {
                    ForEach(parts.filter { $0.1 > 0 }, id: \.0) { cls, n in
                        RoundedRectangle(cornerRadius: 2).fill(cls.color.opacity(0.8))
                            .frame(width: max(4, geo.size.width * CGFloat(n) / CGFloat(total)))
                    }
                }
            }
            .frame(height: 8)
            HStack(spacing: 10) {
                Text("\(split.answered) answered").foregroundStyle(ResolutionClass.answered.color)
                Text("\(split.unanswerable) unanswerable").foregroundStyle(ResolutionClass.unanswerable.color)
                Text("\(split.stillStuck) still stuck").foregroundStyle(ResolutionClass.stillStuck.color)
            }
            .font(.caption)
        }
    }
}

struct Sparkline: View {
    let values: [Int]
    var body: some View {
        GeometryReader { geo in
            let maxV = CGFloat(max(1, values.max() ?? 1))
            Path { p in
                for (i, v) in values.enumerated() {
                    let x = values.count > 1 ? geo.size.width * CGFloat(i) / CGFloat(values.count - 1) : 0
                    let y = geo.size.height * (1 - CGFloat(v) / maxV)
                    i == 0 ? p.move(to: CGPoint(x: x, y: y)) : p.addLine(to: CGPoint(x: x, y: y))
                }
            }
            .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
        }
        .accessibilityLabel("Reports per week: " + values.map(String.init).joined(separator: ", "))
    }
}

/// Evidence for one insight: excerpts with no names and no audio, dates by day only.
struct InsightEvidenceView: View {
    @Environment(AppModel.self) private var model
    let insight: Insight

    var body: some View {
        let evidence = model.data.evidence.first { $0.insightId == insight.id }
        PageScroll {
            VStack(alignment: .leading, spacing: 18) {
                Text(insight.title).font(.panelTitle).wraps()
                HStack(spacing: 10) {
                    Button("Record fix") {}.disabled(true)
                    Button("Assign owner") {}.disabled(true)
                }
                if !insight.evidenceVisible {
                    NoticeStrip(text: "Evidence visible at 5 reports", symbol: "lock")
                } else if let evidence {
                    ForEach(Array(evidence.excerpts.enumerated()), id: \.offset) { _, e in
                        VStack(alignment: .leading, spacing: 8) {
                            Text("\u{201C}\(e.text)\u{201D}").wraps()
                            if e.hasScreenshot { RedactedThumbnail(boxes: [], width: 200) }
                            FlowLayout(spacing: 6) {
                                ForEach(e.appNames, id: \.self) { Chip(text: $0) }
                            }
                            Text(Format.calendarDay(e.day)).font(.caption).foregroundStyle(.secondary)
                        }
                        .padding(12)
                        .background(Palette.card, in: .rect(cornerRadius: 12))
                    }
                    let suspect = model.data.documents.filter { evidence.suspectDocumentIds.contains($0.id) }
                    if !suspect.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Documents marked suspect").font(.headline)
                            ForEach(suspect) { d in Label(d.title, systemImage: "doc.badge.ellipsis").wraps() }
                        }
                    }
                }
            }
            .padding(20)
        }
    }
}
