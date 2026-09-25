import EventSource
import Foundation

/// The part of the service the shell already talks to: `GET /v1/health` and the `POST /v1/events` stub stream.
final class LiveClient {
    let baseURL: URL
    private let session: URLSession

    init(baseURL: URL = LiveClient.configuredBaseURL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    /// `APIBaseURL` from Info.plist, set per build configuration in project.yml.
    static var configuredBaseURL: URL {
        let raw = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String
        return raw.flatMap(URL.init(string:)) ?? URL(string: "http://localhost:8787")!
    }

    func serviceIsReachable() async -> Bool {
        var request = URLRequest(url: baseURL.appending(path: "v1/health"))
        request.timeoutInterval = 3
        guard let (_, response) = try? await session.data(for: request) else { return false }
        return (response as? HTTPURLResponse)?.statusCode == 200
    }

    enum StreamError: Error, Equatable { case badStatus(Int), notAnEventStream }

    /// Posts the body and yields each answer stream event. Uses only `URLSession.bytes` + `.events`:
    /// the `EventSource` client reconnects on its own, which would send the flag twice.
    nonisolated func streamAnswer(for body: EventBody, script: StubScript) -> AsyncThrowingStream<SSEEvent, Error> {
        let url = baseURL.appending(path: "v1/events")
        let session = self.session
        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                    request.setValue(script.rawValue, forHTTPHeaderField: "x-ft-stub-script")
                    request.setValue(body.id.uuidString.lowercased(), forHTTPHeaderField: "Idempotency-Key")
                    request.httpBody = try body.encoded()
                    let (bytes, response) = try await session.bytes(for: request)
                    guard let http = response as? HTTPURLResponse else { throw StreamError.notAnEventStream }
                    guard http.statusCode == 200 else { throw StreamError.badStatus(http.statusCode) }
                    for try await event in bytes.events {
                        continuation.yield(try SSEEvent(name: event.event ?? "message", data: Data(event.data.utf8)))
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
