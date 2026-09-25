import Foundation
import Testing
@testable import Friction

/// The capture engine's deciding parts: what the rolling buffer keeps, what the window timeline records,
/// how files split into upload parts, and that the manifest matches the service's contract.
@MainActor
struct CaptureEngineTests {
    private func segment(_ start: Double, _ end: Double) -> VideoSegment { VideoSegment(start: start, end: end, data: Data([UInt8(Int(start) % 256)])) }

    @Test func givenSegmentsOlderThanThreeMinutes_whenAppending_thenOnlyTheLastThreeMinutesRemain() {
        var ring = SegmentRing(retention: 180)
        for t in stride(from: 0.0, to: 400, by: 2) { ring.append(segment(t, t + 2), now: t + 2, pinnedFrom: nil) }
        // At 400 s the window is 220..400: the segment 220..222 is the oldest one still inside it.
        #expect(ring.segments.first?.start == 220)
        #expect(ring.segments.last?.end == 400)
        #expect(ring.segments.count == 90)
    }

    @Test func givenAPinnedFlag_whenTheEmployeeTalksPastTheRetention_thenNothingAfterThePinIsEvicted() {
        var ring = SegmentRing(retention: 180)
        for t in stride(from: 0.0, to: 200, by: 2) { ring.append(segment(t, t + 2), now: t + 2, pinnedFrom: nil) }
        let pin = 200.0 - 180
        for t in stride(from: 200.0, to: 300, by: 2) { ring.append(segment(t, t + 2), now: t + 2, pinnedFrom: pin) }
        #expect(ring.segments.first?.start == 20)
        #expect(ring.clip(from: pin, to: 300).count == 140)
    }

    @Test func givenAClipWindow_thenOnlyOverlappingSegmentsAreReturnedInOrder() {
        var ring = SegmentRing(retention: 180)
        for t in stride(from: 0.0, to: 20, by: 2) { ring.append(segment(t, t + 2), now: t + 2, pinnedFrom: nil) }
        #expect(ring.clip(from: 5, to: 9).map(\.start) == [4, 6, 8])
    }

    @Test func givenRepeatedSamplesOfTheSameWindow_thenOneEventIsRecorded_andATitleChangeInTheSameAppIsTitleChanged() {
        var log = WindowLog(retention: 180)
        let t0 = Date(timeIntervalSince1970: 1_000)
        let recorded = [
            log.record(appName: "SAP GUI", bundleId: "com.sap", windowTitle: "ME21N", at: t0),
            log.record(appName: "SAP GUI", bundleId: "com.sap", windowTitle: "ME21N", at: t0 + 1),
            log.record(appName: "SAP GUI", bundleId: "com.sap", windowTitle: "ME23N", at: t0 + 2),
            log.record(appName: "Chrome", bundleId: "com.google.Chrome", windowTitle: nil, at: t0 + 3),
        ]
        #expect(recorded == [true, false, true, true])
        #expect(log.events.map(\.reason) == [.activated, .titleChanged, .activated])
        #expect(log.events.map(\.windowTitle) == ["ME21N", "ME23N", nil])
    }

    @Test func givenOldEvents_whenEvicting_thenTheEventInForceAtTheCutoffIsKept_andSliceStartsWithIt() {
        var log = WindowLog(retention: 180)
        let t0 = Date(timeIntervalSince1970: 1_000)
        log.record(appName: "A", bundleId: nil, windowTitle: nil, at: t0)
        log.record(appName: "B", bundleId: nil, windowTitle: nil, at: t0 + 10)
        log.record(appName: "C", bundleId: nil, windowTitle: nil, at: t0 + 300)
        #expect(log.events.map(\.appName) == ["B", "C"])
        #expect(log.slice(from: t0 + 200, to: t0 + 400).map(\.appName) == ["B", "C"])
        #expect(log.slice(from: t0 + 200, to: t0 + 250).map(\.appName) == ["B"])
    }

    @Test func givenAFileOfTwoAndAHalfParts_thenThreePartsCoverEveryByteExactlyOnce() {
        let size = 20, part = 8
        #expect(PartPlan.count(byteSize: size, partSize: part) == 3)
        #expect((1...3).map { PartPlan.range(partNumber: $0, byteSize: size, partSize: part) } == [0..<8, 8..<16, 16..<20])
        #expect(PartPlan.missing(byteSize: size, partSize: part, uploaded: [UploadedPart(partNumber: 2, etag: "e")]) == [1, 3])
        #expect(PartPlan.count(byteSize: 16, partSize: 8) == 2)
    }

    @Test func givenTheManifestFixture_whenDecodedAndReencoded_thenNullsAreWrittenExplicitly() throws {
        let data = try Data(contentsOf: SampleData.bundledDirectory.appending(path: "flag-capture-manifest.json"))
        let manifest = try JSONDecoder.contract.decode(FlagCaptureManifest.self, from: data)
        #expect(manifest.parts.map(\.kind) == [.video, .audio])
        #expect(manifest.windows.map(\.reason) == [.activated, .activated, .titleChanged])
        let noScreen = FlagCaptureManifest(flagId: manifest.flagId, clickedAt: manifest.clickedAt, sentAt: manifest.sentAt,
                                           parts: manifest.parts, screen: nil,
                                           windows: [WindowEvent(at: manifest.sentAt, reason: .activated, appName: "Finder", bundleId: nil, windowTitle: nil)])
        let json = try #require(try JSONSerialization.jsonObject(with: JSONEncoder.contract.encode(noScreen)) as? [String: Any])
        #expect(json["screen"] is NSNull)
        let window = try #require((json["windows"] as? [[String: Any]])?.first)
        #expect(window["bundleId"] is NSNull)
        #expect(window["windowTitle"] is NSNull)
    }

    @Test func givenTheDetailFixture_thenItDecodesWithEveryWordOnTheTimeline() throws {
        let data = try Data(contentsOf: SampleData.bundledDirectory.appending(path: "flag-capture-detail.json"))
        let detail = try JSONDecoder.contract.decode(FlagCaptureDetail.self, from: data)
        #expect(detail.transcriptStatus == .done)
        #expect(detail.words.count == 10)
        #expect(detail.parts.map(\.status) == [.received, .received])
    }
}
