import AppKit

/// Remembers where the pill sits on each display, keyed by the display's stable UUID
/// (a CGDirectDisplayID can change across reconnects). Stored as the pill's right edge and
/// vertical center relative to the screen's visible frame, so size changes keep it anchored.
struct PillPositionStore {
    var defaults: UserDefaults = .standard
    private let key = "pill.positions"

    struct Anchor: Codable, Equatable {
        /// Distance from the visible frame's right edge to the pill's right edge.
        var rightInset: CGFloat
        /// Pill's vertical center as a fraction of the visible frame's height.
        var centerFraction: CGFloat
    }

    static let defaultAnchor = Anchor(rightInset: 12, centerFraction: 0.5)

    func anchor(for screen: NSScreen) -> Anchor {
        guard let id = Self.displayKey(screen), let data = defaults.data(forKey: key),
              let all = try? JSONDecoder().decode([String: Anchor].self, from: data), let a = all[id] else { return Self.defaultAnchor }
        return a
    }

    func save(_ anchor: Anchor, for screen: NSScreen) {
        guard let id = Self.displayKey(screen) else { return }
        var all = (defaults.data(forKey: key)).flatMap { try? JSONDecoder().decode([String: Anchor].self, from: $0) } ?? [:]
        all[id] = anchor
        defaults.set(try? JSONEncoder().encode(all), forKey: key)
    }

    func reset() { defaults.removeObject(forKey: key) }

    static func displayKey(_ screen: NSScreen) -> String? {
        guard let id = screen.cgDirectDisplayID, let uuid = CGDisplayCreateUUIDFromDisplayID(id)?.takeRetainedValue() else { return nil }
        return CFUUIDCreateString(nil, uuid) as String
    }

    /// The pill's frame for a content size, anchored on a screen.
    static func frame(size: NSSize, anchor: Anchor, in visible: NSRect) -> NSRect {
        let maxX = visible.maxX - anchor.rightInset
        let midY = visible.minY + visible.height * anchor.centerFraction
        var r = NSRect(x: maxX - size.width, y: midY - size.height / 2, width: size.width, height: size.height)
        r.origin.x = min(max(r.origin.x, visible.minX), visible.maxX - size.width)
        r.origin.y = min(max(r.origin.y, visible.minY), visible.maxY - size.height)
        return r
    }

    /// The anchor that reproduces a frame on a screen.
    static func anchor(for frame: NSRect, in visible: NSRect) -> Anchor {
        Anchor(rightInset: max(0, visible.maxX - frame.maxX), centerFraction: min(1, max(0, (frame.midY - visible.minY) / visible.height)))
    }
}
