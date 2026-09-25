import Foundation
import Observation

/// Byte arithmetic for multipart uploads: every part but the last is exactly `partSize`.
nonisolated enum PartPlan {
    static func count(byteSize: Int, partSize: Int) -> Int { max(1, (byteSize + partSize - 1) / partSize) }

    static func range(partNumber: Int, byteSize: Int, partSize: Int) -> Range<Int> {
        let start = (partNumber - 1) * partSize
        return start..<min(start + partSize, byteSize)
    }

    static func missing(byteSize: Int, partSize: Int, uploaded: [UploadedPart]) -> [Int] {
        let done = Set(uploaded.map(\.partNumber))
        return (1...count(byteSize: byteSize, partSize: partSize)).filter { !done.contains($0) }
    }
}

/// Flags waiting to reach the cloud, kept on disk so a quit, a crash or a lost connection never loses one.
/// Each item uploads its files in parts, resumes from the last confirmed part, and retries with backoff
/// until the service has every file. Delivered items keep their record; their media files are deleted.
@Observable
final class Outbox {
    enum Status: String, Codable, Sendable { case queued, uploading, retrying, delivered }

    struct Item: Codable, Identifiable, Sendable {
        var id: UUID { manifest.flagId }
        let manifest: FlagCaptureManifest
        var status: Status = .queued
        var uploadIds: [CapturePartKind: String] = [:]
        var uploaded: [CapturePartKind: [UploadedPart]] = [:]
        var completed: Set<CapturePartKind> = []
        var partSize: Int?
        var lastError: String?
        var attempts = 0
        var deliveredAt: Date?

        var partsTotal: Int {
            guard let partSize else { return manifest.parts.count }
            return manifest.parts.reduce(0) { $0 + PartPlan.count(byteSize: $1.byteSize, partSize: partSize) }
        }
        var partsDone: Int { uploaded.values.reduce(0) { $0 + $1.count } }
    }

    private(set) var items: [Item] = []
    @ObservationIgnored private let root: URL
    @ObservationIgnored private let api: CaptureAPI
    @ObservationIgnored private var worker: Task<Void, Never>?

    init(api: CaptureAPI, root: URL = Outbox.defaultRoot) {
        self.api = api
        self.root = root
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        items = Self.load(from: root)
        kick()
    }

    static var defaultRoot: URL {
        URL.applicationSupportDirectory.appending(path: "Friction/Outbox")
    }

    /// Takes ownership of a packaged flag and starts sending it.
    func enqueue(_ flag: PackagedFlag) throws {
        let directory = root.appending(path: flag.manifest.flagId.uuidString.lowercased())
        try? FileManager.default.removeItem(at: directory)
        try FileManager.default.moveItem(at: flag.directory, to: directory)
        let item = Item(manifest: flag.manifest)
        try save(item)
        items.insert(item, at: 0)
        kick()
    }

    /// Starts the upload loop if it is not running.
    func kick() {
        guard worker == nil else { return }
        worker = Task { [weak self] in
            await self?.drain()
            self?.worker = nil
        }
    }

    private func drain() async {
        while let index = items.firstIndex(where: { $0.status != .delivered }) {
            let id = items[index].id
            do {
                try await deliver(id)
            } catch {
                update(id) {
                    $0.status = .retrying
                    $0.lastError = error.localizedDescription
                    $0.attempts += 1
                }
                let attempts = items.first { $0.id == id }?.attempts ?? 1
                captureLog.error("outbox \(id.uuidString, privacy: .public) attempt \(attempts) failed: \(error.localizedDescription, privacy: .public)")
                try? await Task.sleep(for: .seconds(min(60, 1 << min(attempts, 6))))
            }
        }
    }

    private func deliver(_ id: UUID) async throws {
        guard let start = items.first(where: { $0.id == id }) else { return }
        update(id) { $0.status = .uploading }
        let plan = try await api.register(start.manifest)
        update(id) { item in
            item.partSize = plan.partSize
            for part in plan.parts {
                if item.uploadIds[part.kind] != part.uploadId { item.uploaded[part.kind] = [] }
                item.uploadIds[part.kind] = part.uploadId
                if part.received { item.completed.insert(part.kind) }
            }
        }
        for spec in start.manifest.parts {
            guard let item = items.first(where: { $0.id == id }), !item.completed.contains(spec.kind) else { continue }
            let file = directory(of: id).appending(path: PackagedFlag.fileName(for: spec.kind))
            let handle = try FileHandle(forReadingFrom: file)
            defer { try? handle.close() }
            for partNumber in PartPlan.missing(byteSize: spec.byteSize, partSize: plan.partSize, uploaded: item.uploaded[spec.kind] ?? []) {
                let range = PartPlan.range(partNumber: partNumber, byteSize: spec.byteSize, partSize: plan.partSize)
                try handle.seek(toOffset: UInt64(range.lowerBound))
                let data = try handle.read(upToCount: range.count) ?? Data()
                let part = try await api.uploadPart(flagId: id, kind: spec.kind, partNumber: partNumber, data: data)
                update(id) { $0.uploaded[spec.kind, default: []].append(part) }
            }
            let parts = items.first { $0.id == id }?.uploaded[spec.kind] ?? []
            _ = try await api.complete(flagId: id, kind: spec.kind, parts: parts)
            update(id) { $0.completed.insert(spec.kind) }
        }
        update(id) {
            $0.status = .delivered
            $0.lastError = nil
            $0.deliveredAt = .now
        }
        for kind in CapturePartKind.allCases {
            try? FileManager.default.removeItem(at: directory(of: id).appending(path: PackagedFlag.fileName(for: kind)))
        }
        captureLog.info("outbox \(id.uuidString, privacy: .public) delivered")
    }

    // MARK: Persistence

    private func directory(of id: UUID) -> URL { root.appending(path: id.uuidString.lowercased()) }

    private func update(_ id: UUID, _ change: (inout Item) -> Void) {
        guard let index = items.firstIndex(where: { $0.id == id }) else { return }
        change(&items[index])
        try? save(items[index])
    }

    private func save(_ item: Item) throws {
        try JSONEncoder.contract.encode(item).write(to: directory(of: item.id).appending(path: "outbox.json"), options: .atomic)
    }

    private static func load(from root: URL) -> [Item] {
        let dirs = (try? FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)) ?? []
        return dirs
            .compactMap { try? JSONDecoder.contract.decode(Item.self, from: Data(contentsOf: $0.appending(path: "outbox.json"))) }
            .map { item in
                var item = item
                if item.status == .uploading { item.status = .queued }
                return item
            }
            .sorted { $0.manifest.sentAt > $1.manifest.sentAt }
    }
}
