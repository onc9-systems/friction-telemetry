import Foundation

nonisolated extension JSONDecoder {
    /// Decodes contract JSON. Instants are ISO 8601 with or without fractional seconds (JavaScript's
    /// `toISOString()` always writes milliseconds, which `.iso8601` rejects before Swift 6.2 Foundation).
    static var contract: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let s = try decoder.singleValueContainer().decode(String.self)
            if let v = try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(s) { return v }
            if let v = try? Date.ISO8601FormatStyle().parse(s) { return v }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Not an ISO 8601 instant: \(s)"))
        }
        return d
    }
}

nonisolated extension JSONEncoder {
    /// Encodes contract JSON: ISO 8601 instants with milliseconds, matching the Worker's `toISOString()`.
    static var contract: JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .custom { date, encoder in
            var c = encoder.singleValueContainer()
            try c.encode(date.formatted(Date.ISO8601FormatStyle(includingFractionalSeconds: true)))
        }
        e.outputFormatting = [.sortedKeys]
        return e
    }
}
