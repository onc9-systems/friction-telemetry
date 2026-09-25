import SwiftUI

/// The screenshot at full size with a rectangle tool. Drawn rectangles are solid black boxes.
/// Phase 04 burns them into the exported image; the shell keeps them on the sample image.
struct RedactionCanvas: View {
    @Bindable var model: CaptureReviewModel
    @State private var draft: CGRect?
    @State private var selected: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Black out anything you don't want to send").font(.headline).wraps()
                Spacer()
                Button("Done") { model.editingScreenshot = false }.keyboardShortcut(.defaultAction)
            }
            GeometryReader { geo in
                let size = geo.size
                ZStack(alignment: .topLeading) {
                    SampleImage.screenshot.resizable().aspectRatio(contentMode: .fit)
                        .frame(width: size.width, height: size.height)
                    ForEach(Array(model.boxes.enumerated()), id: \.offset) { i, box in
                        let r = denormalize(box, size)
                        Rectangle().fill(.black)
                            .overlay(Rectangle().stroke(selected == i ? Color.accentColor : .clear, lineWidth: 2))
                            .frame(width: r.width, height: r.height)
                            .offset(x: r.minX, y: r.minY)
                            .onTapGesture { selected = i }
                    }
                    if let draft {
                        Rectangle().fill(.black.opacity(0.7))
                            .frame(width: draft.width, height: draft.height)
                            .offset(x: draft.minX, y: draft.minY)
                    }
                }
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 4).onChanged { v in
                    draft = CGRect(x: min(v.startLocation.x, v.location.x), y: min(v.startLocation.y, v.location.y),
                                   width: abs(v.location.x - v.startLocation.x), height: abs(v.location.y - v.startLocation.y))
                }.onEnded { _ in
                    if let draft { model.boxes.append(normalize(draft, size)) }
                    draft = nil
                })
            }
            .aspectRatio(1440.0 / 900.0, contentMode: .fit)
            .clipShape(.rect(cornerRadius: 8))
            HStack {
                Text(model.boxes.isEmpty ? "Drag across the image to draw a box." : "\(model.boxes.count) box\(model.boxes.count == 1 ? "" : "es") drawn. Select one to delete it.")
                    .font(.callout).foregroundStyle(.secondary).wraps()
                Spacer()
                Button("Delete box") {
                    if let s = selected, model.boxes.indices.contains(s) { model.boxes.remove(at: s) }
                    selected = nil
                }
                .disabled(selected == nil)
                .keyboardShortcut(.delete, modifiers: [])
            }
        }
    }

    private func normalize(_ r: CGRect, _ s: CGSize) -> CGRect {
        CGRect(x: r.minX / s.width, y: r.minY / s.height, width: r.width / s.width, height: r.height / s.height)
    }
    private func denormalize(_ r: CGRect, _ s: CGSize) -> CGRect {
        CGRect(x: r.minX * s.width, y: r.minY * s.height, width: r.width * s.width, height: r.height * s.height)
    }
}

/// Screenshot thumbnail with its boxes.
struct RedactedThumbnail: View {
    let boxes: [CGRect]
    var width: CGFloat = 120
    var body: some View {
        let h = width * 900 / 1440
        ZStack(alignment: .topLeading) {
            SampleImage.screenshot.resizable().aspectRatio(contentMode: .fit).frame(width: width, height: h)
            ForEach(Array(boxes.enumerated()), id: \.offset) { _, b in
                Rectangle().fill(.black).frame(width: b.width * width, height: b.height * h).offset(x: b.minX * width, y: b.minY * h)
            }
        }
        .frame(width: width, height: h)
        .clipShape(.rect(cornerRadius: 6))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Palette.hairline))
    }
}
