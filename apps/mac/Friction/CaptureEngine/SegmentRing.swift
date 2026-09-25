import Foundation

/// One fragmented-MP4 media segment and the host-clock span it covers.
nonisolated struct VideoSegment: Sendable, Equatable {
    let start: Double
    let end: Double
    let data: Data
}

/// The rolling screen buffer: the writer's initialization segment plus the media segments of the last
/// `retention` seconds. While a flag is being recorded, segments from `pinnedFrom` on are kept even when
/// they age past the retention, so talking longer never shortens the clip.
nonisolated struct SegmentRing: Sendable {
    let retention: Double
    var initialization: Data?
    private(set) var segments: [VideoSegment] = []

    init(retention: Double) { self.retention = retention }

    mutating func append(_ segment: VideoSegment, now: Double, pinnedFrom: Double?) {
        segments.append(segment)
        evict(now: now, pinnedFrom: pinnedFrom)
    }

    mutating func evict(now: Double, pinnedFrom: Double?) {
        let cutoff = min(now - retention, pinnedFrom ?? .infinity)
        segments.removeAll { $0.end <= cutoff }
    }

    /// Drops everything: a new writer means a new initialization segment the old media cannot follow.
    mutating func reset() {
        initialization = nil
        segments.removeAll()
    }

    /// The segments overlapping `from..<to`, oldest first.
    func clip(from: Double, to: Double) -> [VideoSegment] { segments.filter { $0.end > from && $0.start < to } }

    var coveredUntil: Double? { segments.last?.end }
}
