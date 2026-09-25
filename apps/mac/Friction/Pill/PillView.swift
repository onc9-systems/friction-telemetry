import SwiftUI

/// The pill: a vertical dark capsule at rest (glyph over a status area, Granola's pill),
/// growing leftward into a card for the states that need words.
struct PillView: View {
    let model: PillModel
    var onFinish: () -> Void = {}

    var body: some View {
        Group {
            if model.state.isExpanded || model.hovered {
                expanded
            } else {
                capsule
            }
        }
        .environment(\.colorScheme, .dark)
        .fixedSize()
    }

    // MARK: Rest shape

    /// The glyph sits in the center of the capsule's top cap and the status in the bottom cap, so the
    /// glyph's inset from the top matches its inset from the sides. The hand's weight is in the palm,
    /// the thumb pulls its box right, so it shifts left and settles where its top inset matches its side insets.
    private var capsule: some View {
        let width: CGFloat = 32, height: CGFloat = 58, cap = width / 2
        return ZStack {
            Glyph(size: 17).position(x: cap - 0.75, y: cap + 2.25)
            Group {
                if model.state == .paused {
                    Image(systemName: "rectangle.slash").font(.system(size: 9, weight: .semibold)).foregroundStyle(.secondary)
                } else {
                    ActivityDots(color: .secondary.opacity(0.7), size: 3.5)
                }
            }
            .position(x: cap, y: height - cap)
        }
        .frame(width: width, height: height)
        .background(PillBackground(shape: Capsule()))
    }

    // MARK: Expanded card

    private var expanded: some View {
        HStack(alignment: .center, spacing: 12) {
            content
            Glyph()
        }
        .padding(.leading, 14)
        .padding(.trailing, 10)
        .padding(.vertical, 9)
        .frame(minHeight: 38)
        .frame(maxWidth: 340, alignment: .trailing)
        .background(PillBackground(shape: RoundedRectangle(cornerRadius: 19)))
    }

    @ViewBuilder private var content: some View {
        switch model.state {
        case .idle:
            Text("Hold \(CaptureKeyDisplay.name) to flag").font(.callout).foregroundStyle(.primary)
        case .paused:
            Text("Screen context is off. Flags send voice only.").font(.callout).wraps()
        case .listening:
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) { ActivityDots(color: .green); Text("Listening").font(.callout.weight(.medium)) }
                Text(model.microphoneName).font(.caption).foregroundStyle(.secondary).wraps()
            }
        case .recording:
            HStack(alignment: .center, spacing: 10) {
                Button { model.discard() } label: { Image(systemName: "xmark").frame(width: 22, height: 22) }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Discard")
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        ActivityDots(color: .red)
                        LevelMeter(levels: model.levels)
                        Text(model.timerText).font(.callout.monospacedDigit())
                    }
                    Text(model.transcriptLine).font(.caption).foregroundStyle(.secondary).wraps()
                }
                .frame(width: 210, alignment: .leading)
                Button(action: onFinish) { Image(systemName: "checkmark").frame(width: 22, height: 22) }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Finish")
            }
        case .processing:
            HStack(spacing: 8) { ProgressView().controlSize(.small); Text("Preparing review").font(.callout) }
        case .discarded:
            Text("Discarded. Nothing sent.").font(.callout)
        }
    }
}

private struct Glyph: View {
    var size: CGFloat = 16
    var body: some View {
        Image(systemName: "hand.raised.fill")
            .font(.system(size: size, weight: .semibold))
            .foregroundStyle(.primary)
            .frame(width: size + 4, height: size + 4)
    }
}

private struct PillBackground<S: Shape>: View {
    let shape: S
    var body: some View {
        shape.fill(Color(white: 0.12).opacity(0.94))
            .overlay(shape.strokeBorder(Color.white.opacity(0.12)))
    }
}

/// Three dots, the pill's sign that audio is flowing (green listening, red recording). They do not pulse.
private struct ActivityDots: View {
    let color: Color
    var size: CGFloat = 5
    var body: some View {
        HStack(spacing: size * 0.6) { ForEach(0..<3, id: \.self) { _ in Circle().fill(color).frame(width: size, height: size) } }
    }
}

private struct LevelMeter: View {
    let levels: [Double]
    var body: some View {
        HStack(alignment: .center, spacing: 2) {
            ForEach(Array(levels.enumerated()), id: \.offset) { _, v in
                Capsule().fill(.primary.opacity(0.8)).frame(width: 2.5, height: 4 + 14 * v)
            }
        }
        .frame(height: 18)
        .animation(.linear(duration: 0.12), value: levels)
    }
}

private extension Shape {
    func strokeBorder(_ color: Color) -> some View { stroke(color, lineWidth: 1) }
}
