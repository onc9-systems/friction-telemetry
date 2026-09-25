import SwiftUI

/// The answer card (flow 8), shared by flags and questions. It renders only what the stream has said:
/// no class before a `class` event, and a provisional line that is never silently removed.
struct AnswerCardView: View {
    let session: AnswerSession
    /// Who a routed answer went to ("Procurement owner"); falls back to the initiative's owner.
    var routedTo: String?
    var body: some View {
        let s = session.state
        VStack(alignment: .leading, spacing: 14) {
            if s.phase == .failed {
                NoticeStrip(text: s.failure ?? AnswerState.savedOnThisMac, symbol: "wifi.slash")
            } else {
                if s.phase == .checking || s.phase == .waiting {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Checking the \(s.initiativeName ?? "initiative") docs").foregroundStyle(.secondary).wraps()
                        ProgressView().progressViewStyle(.linear).controlSize(.small)
                    }
                }
                if let provisional = s.provisionalMessage {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Pill(text: "Provisional", color: .orange)
                        Text(provisional).foregroundStyle(.secondary).wraps()
                    }
                }
                if s.showsUpdateNote {
                    Text("Update: the docs do cover this.").font(.callout.weight(.medium)).wraps()
                }
                if !s.text.isEmpty {
                    answerText(s)
                }
                ForEach(s.citations, id: \.index) { c in
                    QuoteBlock(citation: c)
                }
                if let cls = s.resolutionClass {
                    resolutionRow(s, cls)
                }
                if s.phase == .finished {
                    if s.markedStillStuck {
                        Text(AnswerState.stillStuckConfirmation).font(.callout).foregroundStyle(.secondary).wraps()
                    } else if s.resolutionClass == .answered {
                        Button("This didn't solve it") { session.markStillStuck() }
                            .buttonStyle(.bordered)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .animation(.easeOut(duration: 0.15), value: s)
    }

    private func answerText(_ s: AnswerState) -> some View {
        // Numbered citation chips follow the text inline. Phase 06 adds charOffset to place them mid-text.
        let chips = s.citations.map { " [\($0.index)]" }.joined()
        return (Text(s.text) + Text(chips).foregroundStyle(Color.accentColor).fontWeight(.semibold))
            .font(.body)
            .textSelection(.enabled)
            .wraps()
    }

    private func resolutionRow(_ s: AnswerState, _ cls: ResolutionClass) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            ClassPill(resolutionClass: cls)
            if let n = s.othersCount { Text("\(n) others hit this").foregroundStyle(.secondary).wraps() }
            if cls != .answered, let target = routedTo ?? s.initiativeName.map({ "the \($0) owner" }) {
                Text("Routed to \(target)").foregroundStyle(.secondary).wraps()
            }
            Spacer(minLength: 0)
        }
        .font(.callout)
    }
}

/// A cited passage: exact text, source, and a link that opens the document at the passage (phase 06).
struct QuoteBlock: View {
    let citation: SSEEvent.CitationEvent
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(citation.index)")
                .font(.caption.weight(.bold))
                .frame(width: 18, height: 18)
                .background(Color.accentColor.opacity(0.15), in: .circle)
            VStack(alignment: .leading, spacing: 6) {
                Text(citation.quote).italic().wraps()
                Text([citation.documentTitle, citation.locator].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption).foregroundStyle(.secondary).wraps()
                Button("Open at passage") {}
                    .buttonStyle(.link)
                    .font(.caption)
                    .disabled(true)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.card, in: .rect(cornerRadius: 10))
    }
}
