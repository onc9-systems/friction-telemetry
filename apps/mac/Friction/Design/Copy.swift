import Foundation

// UI words for contract values. Status words come only from the Core Concepts vocabulary.

extension ResolutionClass {
    var title: String {
        switch self {
        case .answered: "Answered"
        case .unanswerable: "Sent to owner"
        case .stillStuck: "Still stuck"
        }
    }
}

extension RecordOutcome {
    var title: String {
        switch self {
        case .answered: "Answered"
        case .withOwner: "With owner"
        case .fixed: "Fixed"
        }
    }
}

extension InitiativeStatus {
    var title: String {
        switch self {
        case .draft: "Draft"
        case .live: "Live"
        case .closed: "Closed"
        }
    }
}

extension ThesisVerdict {
    var title: String {
        switch self {
        case .holding: "Holding"
        case .breaking: "Breaking"
        case .noEvidence: "No evidence yet"
        }
    }
}

extension HealthLabel {
    var title: String {
        switch self {
        case .healthy: "Healthy"
        case .atRisk: "At risk"
        case .breaking: "Breaking"
        }
    }
}

extension TimelineStep {
    var title: String {
        switch self {
        case .sent: "Sent"
        case .answered: "Answered"
        case .routed: "Routed"
        case .qaPublished: "Q&A published"
        case .fixed: "Fixed"
        }
    }
}

extension DocumentVersionStatus {
    var title: String {
        switch self {
        case .uploading: "Uploading"
        case .extracting: "Extracting"
        case .indexing: "Indexing"
        case .ready: "Ready"
        case .failed: "Failed"
        }
    }
}

enum Format {
    /// "Today", "Yesterday", or "Monday 21 September".
    static func dayHeader(_ date: Date, now: Date = .now, calendar: Calendar = .current) -> String {
        if calendar.isDate(date, inSameDayAs: now) { return "Today" }
        if let y = calendar.date(byAdding: .day, value: -1, to: now), calendar.isDate(date, inSameDayAs: y) { return "Yesterday" }
        return date.formatted(.dateTime.weekday(.wide).day().month(.wide))
    }

    /// "4:30 PM"
    static func time(_ date: Date) -> String { date.formatted(date: .omitted, time: .shortened) }

    /// "18 September"
    static func dayMonth(_ date: Date) -> String { date.formatted(.dateTime.day().month(.wide)) }

    /// "18 September" from a contract calendar date string ("2026-09-18").
    static func calendarDay(_ string: String) -> String {
        guard let d = try? Date(string + "T12:00:00Z", strategy: .iso8601) else { return string }
        return dayMonth(d)
    }

    static func initials(_ name: String) -> String {
        name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined()
    }

    static func people(_ count: Int) -> String { count == 1 ? "1 person" : "\(count) people" }

    /// "3:18" for a span of 198 seconds.
    static func duration(_ seconds: TimeInterval) -> String {
        let s = max(0, Int(seconds.rounded()))
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}
