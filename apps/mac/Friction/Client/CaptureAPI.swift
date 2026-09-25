import Foundation

/// The capture intake routes (`/v1/captures`): register, upload parts, complete, and read back.
nonisolated struct CaptureAPI: Sendable {
    let baseURL: URL
    var session: URLSession = .shared

    struct Failure: Error, LocalizedError {
        let status: Int
        let body: String
        var errorDescription: String? { "The service answered \(status): \(body)" }
    }

    func register(_ manifest: FlagCaptureManifest) async throws -> CaptureUploadPlan {
        try await send("POST", "v1/captures", json: JSONEncoder.contract.encode(manifest))
    }

    func uploadPart(flagId: UUID, kind: CapturePartKind, partNumber: Int, data: Data) async throws -> UploadedPart {
        var request = URLRequest(url: baseURL.appending(path: "v1/captures/\(flagId.uuidString.lowercased())/parts/\(kind.rawValue)/\(partNumber)"))
        request.httpMethod = "PUT"
        request.identify()
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 120
        let (body, response) = try await session.upload(for: request, from: data)
        return try decode(body, response)
    }

    func complete(flagId: UUID, kind: CapturePartKind, parts: [UploadedPart]) async throws -> FlagCaptureSummary {
        struct Body: Encodable { let parts: [UploadedPart] }
        return try await send("POST", "v1/captures/\(flagId.uuidString.lowercased())/parts/\(kind.rawValue)/complete",
                              json: JSONEncoder.contract.encode(Body(parts: parts)))
    }

    /// Downloads a received part once (as the acting person) and returns the cached local file. AVFoundation
    /// has no public option for request headers, so players read this file rather than the service URL.
    func cachedContent(flagId: UUID, kind: CapturePartKind) async throws -> URL {
        let dir = URL.cachesDirectory.appending(path: "Friction/Recordings")
        let file = dir.appending(path: "\(flagId.uuidString.lowercased())-\(kind.rawValue).\(kind == .video ? "mp4" : "m4a")")
        if FileManager.default.fileExists(atPath: file.path) { return file }
        var request = URLRequest(url: baseURL.appending(path: "v1/captures/\(flagId.uuidString.lowercased())/parts/\(kind.rawValue)/content"))
        request.identify()
        request.timeoutInterval = 120
        let (temp, response) = try await session.download(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else { throw Failure(status: status, body: (try? String(contentsOf: temp, encoding: .utf8)) ?? "") }
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? FileManager.default.removeItem(at: file)
        try FileManager.default.moveItem(at: temp, to: file)
        return file
    }

    func list() async throws -> [FlagCaptureSummary] { try await send("GET", "v1/captures") }

    func detail(_ flagId: UUID) async throws -> FlagCaptureDetail { try await send("GET", "v1/captures/\(flagId.uuidString.lowercased())") }

    func retryTranscription(_ flagId: UUID) async throws {
        var request = URLRequest(url: baseURL.appending(path: "v1/captures/\(flagId.uuidString.lowercased())/transcribe"))
        request.httpMethod = "POST"
        request.identify()
        let (body, response) = try await session.data(for: request)
        try check(body, response)
    }

    private func send<T: Decodable>(_ method: String, _ path: String, json: Data? = nil) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.identify()
        request.timeoutInterval = 60
        if let json {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = json
        }
        let (body, response) = try await session.data(for: request)
        return try decode(body, response)
    }

    private func decode<T: Decodable>(_ body: Data, _ response: URLResponse) throws -> T {
        try check(body, response)
        return try JSONDecoder.contract.decode(T.self, from: body)
    }

    private func check(_ body: Data, _ response: URLResponse) throws {
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw Failure(status: status, body: String(decoding: body, as: UTF8.self)) }
    }
}
