import SwiftUI

/// Ask (flow 7): a chat about the person's initiatives. Answers use the same card as flags.
/// No suggested prompts and no follow-up chips, ever.
struct AskView: View {
    @Environment(AppModel.self) private var model
    @State private var text = ""

    var body: some View {
        @Bindable var model = model
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                PageScroll {
                    Column {
                        VStack(alignment: .leading, spacing: 22) {
                            Text("Ask").font(.pageTitle).padding(.top, 28)
                            if model.askTurns.isEmpty {
                                EmptyStateText(text: "Ask anything about the changes you're part of. Answers come from the initiative's documents.")
                            }
                            ForEach(model.askTurns) { turn in
                                VStack(alignment: .leading, spacing: 12) {
                                    HStack {
                                        Spacer(minLength: 80)
                                        Text(turn.text)
                                            .wraps()
                                            .padding(.horizontal, 14).padding(.vertical, 10)
                                            .background(Color.accentColor.opacity(0.15), in: .rect(cornerRadius: 14))
                                    }
                                    AnswerCardView(session: turn.session)
                                }
                                .id(turn.id)
                            }
                        }
                        .padding(.bottom, 24)
                    }
                }
                .onChange(of: model.askTurns.count) { _, _ in
                    if let last = model.askTurns.last { withAnimation { proxy.scrollTo(last.id, anchor: .top) } }
                }
            }
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Text("Asking about:").foregroundStyle(.secondary)
                    Menu {
                        ForEach(model.liveInitiatives) { i in Button(i.name) { model.askScope = i.id } }
                    } label: {
                        Text(model.initiative(model.askScope)?.name ?? "Choose an initiative")
                    }
                    .menuStyle(.borderlessButton)
                    .fixedSize()
                }
                .font(.callout)
                AskComposer(text: $text, placeholder: "Ask a question") {
                    model.ask(text)
                    text = ""
                }
            }
            .frame(maxWidth: 760)
            .padding(.horizontal, 32)
            .padding(.vertical, 16)
        }
    }
}
