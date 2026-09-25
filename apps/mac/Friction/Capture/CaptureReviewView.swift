import SwiftUI

/// "This will be sent" (flow 6). Laid out like Granola's draft modal: serif title, rows,
/// a notice strip, and the primary action on the left of the footer.
struct CaptureReviewView: View {
    @Bindable var model: CaptureReviewModel
    let initiatives: [Initiative]
    var onSend: () -> Void
    var onDiscard: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if model.editingScreenshot {
                RedactionCanvas(model: model)
            } else {
                header
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(CaptureReviewModel.Item.allCases) { item in row(item) }
                    }
                }
                NoticeStrip(text: "Leaders see this without your name.")
                footer
            }
        }
        .padding(22)
        .frame(width: 560, height: 640)
        .background(.regularMaterial, in: .rect(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Palette.hairline))
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("This will be sent").font(.panelTitle)
            Spacer()
            Menu {
                ForEach(initiatives) { i in Button(i.name) { model.initiativeId = i.id } }
            } label: {
                Text(initiatives.first { $0.id == model.initiativeId }?.name ?? "Choose an initiative")
            }
            .menuStyle(.button)
            .fixedSize()
        }
    }

    @ViewBuilder private func row(_ item: CaptureReviewModel.Item) -> some View {
        if model.removed.contains(item) || (item == .apps && model.appNames.isEmpty) {
            HStack(spacing: 6) {
                Text("\(item.title) removed.").foregroundStyle(.secondary)
                Button("Undo") {
                    model.undo(item)
                    if item == .apps && model.appNames.isEmpty { model.appNames = ["Chrome", "HubSpot", "Slack"] }
                }
                .buttonStyle(.link)
            }
            .font(.callout)
            .padding(.vertical, 4)
        } else {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(item.title).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                    content(item)
                }
                Spacer(minLength: 0)
                Button { model.remove(item) } label: { Image(systemName: "xmark") }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Remove \(item.title.lowercased())")
            }
            .padding(12)
            .background(Palette.card, in: .rect(cornerRadius: 12))
        }
    }

    @ViewBuilder private func content(_ item: CaptureReviewModel.Item) -> some View {
        switch item {
        case .transcript:
            TextEditor(text: $model.transcript)
                .font(.body)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 96)
        case .screenshot:
            Button { model.editingScreenshot = true } label: { RedactedThumbnail(boxes: model.boxes, width: 200) }
                .buttonStyle(.plain)
                .help("Open to black out parts of the screenshot")
        case .clip:
            HStack(spacing: 12) {
                ZStack {
                    RedactedThumbnail(boxes: model.boxes, width: 120).opacity(0.85)
                    Image(systemName: "play.fill").foregroundStyle(.white).shadow(radius: 2)
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("0:12").font(.callout.monospacedDigit())
                    Capsule().fill(Palette.hairline).frame(width: 180, height: 4)
                        .overlay(alignment: .leading) { Capsule().fill(Color.accentColor).frame(width: 60, height: 4) }
                }
            }
        case .apps:
            FlowLayout(spacing: 6) {
                ForEach(model.appNames, id: \.self) { name in
                    Chip(text: name) { model.appNames.removeAll { $0 == name } }
                }
            }
        }
    }

    private var footer: some View {
        HStack {
            Button(model.sendTitle, action: onSend)
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.return, modifiers: .command)
                .disabled(!model.canSend)
            Text("⌘↩").font(.caption).foregroundStyle(.secondary)
            Button("Discard", action: onDiscard)
                .buttonStyle(.bordered)
                .keyboardShortcut(.cancelAction)
            Spacer()
        }
    }
}

/// Wrapping row layout for chips.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0, maxX: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > 0, x + s.width > width { x = 0; y += rowH + spacing; rowH = 0 }
            x += s.width + spacing; rowH = max(rowH, s.height); maxX = max(maxX, x - spacing)
        }
        return CGSize(width: maxX, height: y + rowH)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowH: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > bounds.minX, x + s.width > bounds.maxX { x = bounds.minX; y += rowH + spacing; rowH = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing; rowH = max(rowH, s.height)
        }
    }
}
