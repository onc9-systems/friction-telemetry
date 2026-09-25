import SwiftUI

// Shared pieces for both surfaces. Worker surface follows Granola (osis/references/granola),
// initiative surface follows Linear. Text never truncates: every label wraps.

extension Font {
    /// Page and panel titles use New York, the macOS system serif.
    static let pageTitle = Font.system(size: 30, weight: .regular, design: .serif)
    static let panelTitle = Font.system(size: 22, weight: .regular, design: .serif)
}

extension View {
    /// Lets text wrap to as many lines as it needs, never truncating.
    func wraps() -> some View { lineLimit(nil).fixedSize(horizontal: false, vertical: true) }
}

enum Palette {
    static let card = Color.primary.opacity(0.045)
    static let hairline = Color.primary.opacity(0.09)
    static let muted = Color.secondary
    static let answered = Color.green
    static let routed = Color.orange
    static let stuck = Color.red
}

struct Card<Content: View>: View {
    var padding: CGFloat = 16
    @ViewBuilder var content: Content
    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.card, in: .rect(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Palette.hairline))
    }
}

struct Pill: View {
    let text: String
    var color: Color = .secondary
    var symbol: String?
    var body: some View {
        HStack(spacing: 4) {
            if let symbol { Image(systemName: symbol).imageScale(.small) }
            Text(text).wraps()
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(color.opacity(0.12), in: .capsule)
    }
}

struct ClassPill: View {
    let resolutionClass: ResolutionClass
    var body: some View { Pill(text: resolutionClass.title, color: resolutionClass.color) }
}

extension ResolutionClass {
    var color: Color {
        switch self {
        case .answered: Palette.answered
        case .unanswerable: Palette.routed
        case .stillStuck: Palette.stuck
        }
    }
}

extension ThesisVerdict {
    var color: Color {
        switch self {
        case .holding: .green
        case .breaking: .red
        case .noEvidence: .secondary
        }
    }
}

extension HealthLabel {
    var color: Color {
        switch self {
        case .healthy: .green
        case .atRisk: .orange
        case .breaking: .red
        }
    }
}

extension InitiativeStatus {
    var color: Color {
        switch self {
        case .draft: .secondary
        case .live: .blue
        case .closed: .gray
        }
    }
}

/// A chip with a label and an optional remove button (app names, initiative chips).
struct Chip: View {
    let text: String
    var symbol: String?
    var onRemove: (() -> Void)?
    var body: some View {
        HStack(spacing: 5) {
            if let symbol { Image(systemName: symbol).foregroundStyle(.secondary) }
            Text(text).wraps()
            if let onRemove {
                Button(action: onRemove) { Image(systemName: "xmark").imageScale(.small) }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Remove \(text)")
            }
        }
        .font(.callout)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Palette.card, in: .capsule)
        .overlay(Capsule().strokeBorder(Palette.hairline))
    }
}

/// Granola's 40 pt rounded-square list tile.
struct IconTile: View {
    let symbol: String
    var tint: Color = .secondary
    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(tint)
            .frame(width: 40, height: 40)
            .background(Palette.card, in: .rect(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Palette.hairline))
    }
}

struct Avatar: View {
    let name: String
    var size: CGFloat = 22
    var body: some View {
        Text(Format.initials(name))
            .font(.system(size: size * 0.42, weight: .semibold))
            .frame(width: size, height: size)
            .background(Color.accentColor.opacity(0.18), in: .circle)
    }
}

/// A notice strip with an info icon (Granola's draft modal).
struct NoticeStrip: View {
    let text: String
    var symbol = "info.circle"
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Image(systemName: symbol).foregroundStyle(.secondary)
            Text(text).wraps()
            Spacer(minLength: 0)
        }
        .font(.callout)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Palette.card, in: .rect(cornerRadius: 12))
    }
}

/// Empty state copy, centered, wrapping.
struct EmptyStateText: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.title3)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .wraps()
            .frame(maxWidth: 440)
            .frame(maxWidth: .infinity, minHeight: 240)
    }
}

/// The centered content column that keeps its width with the sidebar open or collapsed.
struct Column<Content: View>: View {
    var maxWidth: CGFloat = 760
    @ViewBuilder var content: Content
    var body: some View {
        content
            .frame(maxWidth: maxWidth, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 32)
    }
}

/// The sample screenshot bundled with the app (a made-up SAP Ariba purchase order).
enum SampleImage {
    static var screenshot: Image {
        if let img = NSImage(named: "SampleScreenshot") { return Image(nsImage: img) }
        return Image(systemName: "photo")
    }
}

extension EnvironmentValues {
    /// Debug snapshots render pages without a ScrollView, which SwiftUI's ImageRenderer cannot draw.
    @Entry var snapshotMode = false
}

/// A page's vertical scroll. In snapshot mode the content is laid out flat so it can be rendered to an image.
struct PageScroll<Content: View>: View {
    @Environment(\.snapshotMode) private var snapshotMode
    @ViewBuilder var content: Content
    var body: some View {
        if snapshotMode { VStack(spacing: 0) { content } } else { ScrollView { content } }
    }
}
