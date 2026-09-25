import AVKit
import SwiftUI

/// Internal pipeline check: every flag this Mac captured, where it stands on the Mac (outbox), and what the
/// cloud holds for it (each file, the window timeline, the transcript). Polls the service every 3 seconds.
struct IntakeView: View {
    @Environment(Outbox.self) private var outbox
    @Environment(CaptureEngine.self) private var engine
    @State private var cloud: [UUID: FlagCaptureSummary] = [:]
    @State private var cloudError: String?
    @State private var expanded: UUID?
    @State private var details: [UUID: FlagCaptureDetail] = [:]

    private let api = CaptureAPI(baseURL: LiveClient.configuredBaseURL)

    /// Local items first by send time, plus captures the cloud holds that this Mac no longer tracks.
    private var ids: [UUID] {
        let local = outbox.items.map(\.id)
        let remote = cloud.values.sorted { $0.sentAt > $1.sentAt }.map(\.flagId).filter { !local.contains($0) }
        return local + remote
    }

    var body: some View {
        PageScroll {
            Column(maxWidth: 820) {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Intake").font(.pageTitle).padding(.top, 28)
                    NoticeStrip(text: screenLine, symbol: "record.circle")
                    if let cloudError { NoticeStrip(text: "Couldn't reach the service: \(cloudError)", symbol: "exclamationmark.triangle") }
                    if ids.isEmpty {
                        EmptyStateText(text: "No flags yet. Click the hand, say what happened, then click the send icon.")
                    }
                    ForEach(ids, id: \.self) { id in
                        row(id)
                    }
                }
                .padding(.bottom, 40)
            }
        }
        .task {
            while !Task.isCancelled {
                await refresh()
                try? await Task.sleep(for: .seconds(3))
            }
        }
    }

    private var screenLine: String {
        switch engine.screenState {
        case .recording: "Screen buffer on: the last \(Int(ScreenBuffer.retention)) seconds, 1280 wide at 5 frames a second, kept on this Mac until a flag is sent."
        case .starting: "Screen buffer starting."
        case .off: "Screen buffer off."
        case .needsPermission: "Screen buffer off: Friction needs Screen Recording (System Settings, Privacy and Security). Quit and reopen Friction after allowing it. Flags send voice only until then."
        case .failed(let message): "Screen buffer stopped: \(message). Retrying."
        }
    }

    private func refresh() async {
        do {
            let list = try await api.list()
            cloud = Dictionary(uniqueKeysWithValues: list.map { ($0.flagId, $0) })
            cloudError = nil
            if let expanded, cloud[expanded] != nil { details[expanded] = try? await api.detail(expanded) }
        } catch {
            cloudError = error.localizedDescription
        }
    }

    // MARK: Row

    private func row(_ id: UUID) -> some View {
        let local = outbox.items.first { $0.id == id }
        let remote = cloud[id]
        let sentAt = local?.manifest.sentAt ?? remote?.sentAt ?? .now
        return Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(sentAt.formatted(date: .abbreviated, time: .standard)).font(.headline)
                        Text("Flag \(id.uuidString.lowercased())").font(.caption.monospaced()).foregroundStyle(.secondary).textSelection(.enabled).wraps()
                    }
                    Spacer(minLength: 12)
                    Button(expanded == id ? "Hide timeline" : "Show timeline") { toggle(id) }
                        .disabled(remote == nil)
                }
                line("On this Mac", local.map(macStatus) ?? "Not tracked on this Mac")
                if let remote, let video = remote.parts.first(where: { $0.kind == .video && $0.status == .received }) {
                    RecordingPreview(
                        url: api.contentURL(flagId: id, kind: .video),
                        duration: video.endedAt.timeIntervalSince(video.startedAt),
                        // The poster is the frame on screen when the employee clicked the hand.
                        posterAt: remote.clickedAt.timeIntervalSince(video.startedAt)
                    )
                    .id(video.receivedAt)
                }
                if let remote {
                    ForEach(remote.parts, id: \.kind) { part in line(part.kind == .video ? "Video" : "Audio", cloudStatus(part)) }
                    if !remote.parts.contains(where: { $0.kind == .video }) { line("Video", "None: screen recording was off for this flag") }
                    line("Windows", "\(remote.windowCount) frontmost-window changes")
                    transcript(remote)
                } else {
                    line("In the cloud", "Not registered yet")
                }
                if expanded == id, let detail = details[id] { TimelineList(detail: detail) }
            }
        }
    }

    private func transcript(_ s: FlagCaptureSummary) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                line("Transcript", transcriptStatus(s))
                if s.transcriptStatus == .failed {
                    Button("Retry") { Task { try? await api.retryTranscription(s.flagId); await refresh() } }
                }
            }
            if let text = s.transcript, !text.isEmpty { Text("\u{201C}\(text)\u{201D}").font(.body).wraps().textSelection(.enabled) }
            if let error = s.transcriptError { Text(error).font(.callout).foregroundStyle(.red).wraps() }
        }
    }

    private func line(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(label).font(.callout.weight(.medium)).frame(width: 96, alignment: .leading)
            Text(value).font(.callout).foregroundStyle(.secondary).wraps()
        }
    }

    private func toggle(_ id: UUID) {
        expanded = expanded == id ? nil : id
        if expanded == id { Task { details[id] = try? await api.detail(id) } }
    }

    private func macStatus(_ item: Outbox.Item) -> String {
        switch item.status {
        case .queued: "Queued to send"
        case .uploading: "Uploading, \(item.partsDone) of \(item.partsTotal) parts sent"
        case .retrying: "Retrying (attempt \(item.attempts)): \(item.lastError ?? "unknown error")"
        case .delivered: "Delivered \(item.deliveredAt?.formatted(date: .omitted, time: .standard) ?? ""), local files deleted"
        }
    }

    private func cloudStatus(_ p: CapturePartState) -> String {
        let size = p.byteSize.formatted(.byteCount(style: .file))
        let span = Format.duration(p.endedAt.timeIntervalSince(p.startedAt))
        let times = "\(p.startedAt.formatted(date: .omitted, time: .standard)) to \(p.endedAt.formatted(date: .omitted, time: .standard))"
        switch p.status {
        case .uploading: return "Uploading: \(size), \(span) (\(times))"
        case .received: return "Received \(p.receivedAt?.formatted(date: .omitted, time: .standard) ?? ""): \(size), \(span) (\(times))"
        }
    }

    private func transcriptStatus(_ s: FlagCaptureSummary) -> String {
        switch s.transcriptStatus {
        case .waiting: "Waiting for Deepgram"
        case .transcribing: "Transcribing with Deepgram"
        case .done: "Done"
        case .failed: "Failed"
        }
    }
}

/// The flag's screen recording: a poster frame with a play button, which becomes an AVKit player on click.
/// Both stream from the service, which answers Range reads straight from R2.
private struct RecordingPreview: View {
    let url: URL
    let duration: TimeInterval
    let posterAt: TimeInterval

    @State private var poster: NSImage?
    @State private var aspect: Double = 1280.0 / 832.0
    @State private var failure: String?
    @State private var playing = false

    var body: some View {
        ZStack {
            if playing {
                PlayerView(url: url)
            } else {
                Button { playing = true } label: { posterFace }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Play the recording")
            }
        }
        .aspectRatio(aspect, contentMode: .fit)
        .frame(maxWidth: .infinity)
        .clipShape(.rect(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Palette.hairline))
        .task(id: url) { await loadPoster() }
    }

    private var posterFace: some View {
        ZStack {
            Color.black
            if let poster {
                Image(nsImage: poster).resizable().aspectRatio(contentMode: .fit)
            } else if let failure {
                Text("Couldn't load a preview: \(failure)").font(.callout).foregroundStyle(.white.opacity(0.8)).wraps().padding()
            } else {
                ProgressView().controlSize(.small).tint(.white)
            }
            Image(systemName: "play.fill")
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(.black.opacity(0.55), in: .circle)
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Text(Format.duration(duration))
                        .font(.caption.monospacedDigit().weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.black.opacity(0.6), in: .rect(cornerRadius: 4))
                }
            }
            .padding(8)
        }
        .contentShape(.rect)
    }

    private func loadPoster() async {
        let asset = AVURLAsset(url: url)
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: 1280, height: 1280)
        generator.requestedTimeToleranceBefore = CMTime(seconds: 0.5, preferredTimescale: 600)
        generator.requestedTimeToleranceAfter = CMTime(seconds: 0.5, preferredTimescale: 600)
        let at = min(max(0, posterAt), max(0, duration - 0.2))
        do {
            let (image, _) = try await generator.image(at: CMTime(seconds: at, preferredTimescale: 600))
            aspect = Double(image.width) / Double(image.height)
            poster = NSImage(cgImage: image, size: NSSize(width: image.width, height: image.height))
        } catch {
            failure = error.localizedDescription
        }
    }
}

/// AVKit's native macOS player view (inline controls: play, scrub, volume, full screen). Plays on appear.
private struct PlayerView: NSViewRepresentable {
    let url: URL

    func makeNSView(context: Context) -> AVPlayerView {
        let view = AVPlayerView()
        view.controlsStyle = .inline
        view.videoGravity = .resizeAspect
        view.showsFullScreenToggleButton = true
        let player = AVPlayer(url: url)
        view.player = player
        player.play()
        return view
    }

    func updateNSView(_ view: AVPlayerView, context: Context) {}

    static func dismantleNSView(_ view: AVPlayerView, coordinator: ()) {
        view.player?.pause()
        view.player = nil
    }
}

/// The capture's synced timeline: window changes and spoken sentences in time order, each at its instant.
private struct TimelineList: View {
    let detail: FlagCaptureDetail

    private enum Entry: Identifiable {
        case window(WindowEvent)
        case speech(Date, String)
        var at: Date {
            switch self {
            case .window(let w): w.at
            case .speech(let at, _): at
            }
        }
        var id: String {
            switch self {
            case .window(let w): "w\(w.at.timeIntervalSince1970)\(w.appName)\(w.windowTitle ?? "")"
            case .speech(let at, let text): "s\(at.timeIntervalSince1970)\(text)"
            }
        }
    }

    /// Words grouped into sentences at terminal punctuation, each stamped with its first word's instant.
    private var entries: [Entry] {
        var sentences: [Entry] = []
        var current: [TranscriptWord] = []
        for word in detail.words {
            current.append(word)
            if let last = word.word.last, ".?!".contains(last) {
                sentences.append(.speech(current[0].startedAt, current.map(\.word).joined(separator: " ")))
                current = []
            }
        }
        if let first = current.first { sentences.append(.speech(first.startedAt, current.map(\.word).joined(separator: " "))) }
        return (detail.windows.map(Entry.window) + sentences).sorted { $0.at < $1.at }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Divider()
            Text("Timeline").font(.headline)
            ForEach(entries) { entry in
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text(entry.at.formatted(.dateTime.hour().minute().second().secondFraction(.fractional(3))))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 96, alignment: .leading)
                    switch entry {
                    case .window(let w):
                        Label {
                            Text("\(w.appName)\(w.windowTitle.map { ": \($0)" } ?? "")").wraps()
                        } icon: {
                            Image(systemName: w.reason == .activated ? "macwindow" : "arrow.triangle.2.circlepath")
                        }
                        .font(.callout)
                    case .speech(_, let text):
                        Label { Text(text).wraps() } icon: { Image(systemName: "waveform") }.font(.callout)
                    }
                }
            }
        }
    }
}
