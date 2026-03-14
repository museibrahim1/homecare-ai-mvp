import SwiftUI

struct PalmAgentMessage: Identifiable {
    let id = UUID()
    let role: String
    let content: String
}

@MainActor
class PalmAgentViewModel: ObservableObject {
    @Published var messages: [PalmAgentMessage] = []
    @Published var input = ""
    @Published var isLoading = false

    func send(api: APIService) async {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isLoading else { return }
        input = ""
        messages.append(PalmAgentMessage(role: "user", content: text))
        isLoading = true
        defer { isLoading = false }

        let history: [[String: Any]] = messages.suffix(20).map { ["role": $0.role, "content": $0.content] }
        let body: [String: Any] = ["message": text, "history": history]

        do {
            let result: AgentResponse = try await api.request(
                "POST",
                path: "/platform/agent/chat",
                body: body
            )
            messages.append(PalmAgentMessage(role: "assistant", content: result.response))
        } catch {
            messages.append(PalmAgentMessage(role: "assistant", content: "Something went wrong: \(error.localizedDescription)"))
        }
    }
}

struct AgentResponse: Codable {
    let response: String
    let tool_calls: [AnyCodable]?

    struct AnyCodable: Codable {
        init(from decoder: Decoder) throws {
            let _ = try decoder.singleValueContainer()
        }
        func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            try container.encodeNil()
        }
    }
}

struct PalmAgentButton: View {
    @Binding var isOpen: Bool

    var body: some View {
        Button { isOpen = true } label: {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.palmPrimary, Color(red: 0.04, green: 0.65, blue: 0.53)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 56, height: 56)
                    .shadow(color: Color.palmPrimary.opacity(0.35), radius: 8, y: 4)

                Image(systemName: "sparkles")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.white)
            }
        }
        .accessibilityLabel("Open Palm AI assistant")
    }
}

struct PalmAgentSheet: View {
    @EnvironmentObject var api: APIService
    @StateObject private var vm = PalmAgentViewModel()
    @Binding var isPresented: Bool
    let isAdmin: Bool

    private var suggestions: [String] {
        if isAdmin {
            return ["What are my outreach stats?", "Send all agency emails", "Show me pending work", "List my callbacks"]
        }
        return ["List my clients", "Show my pending tasks", "How many assessments this week?", "Create a note"]
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                messagesArea
                inputBar
            }
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .navigationTitle("Palm AI")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { isPresented = false }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Clear") { vm.messages.removeAll() }
                        .foregroundColor(.red)
                        .disabled(vm.messages.isEmpty)
                }
            }
        }
    }

    private var messagesArea: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    if vm.messages.isEmpty {
                        welcomeView
                    }

                    ForEach(vm.messages) { msg in
                        messageBubble(msg)
                            .id(msg.id)
                    }

                    if vm.isLoading {
                        HStack(spacing: 6) {
                            ProgressView()
                                .tint(.palmPrimary)
                            Text("Thinking...")
                                .font(.caption)
                                .foregroundColor(.palmSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16)
                        .id("loading")
                    }
                }
                .padding(.vertical, 16)
            }
            .onChange(of: vm.messages.count) { _ in
                withAnimation {
                    if let last = vm.messages.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    private var welcomeView: some View {
        VStack(spacing: 16) {
            Image(systemName: "sparkles")
                .font(.system(size: 36))
                .foregroundColor(.palmPrimary)
                .padding(.top, 32)

            Text("Hi! I'm Palm.")
                .font(.headline)
                .foregroundColor(.primary)

            Text("Your intelligent assistant. Ask me anything about your workspace.")
                .font(.subheadline)
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            FlowLayout(spacing: 8) {
                ForEach(suggestions, id: \.self) { s in
                    Button {
                        vm.input = s
                    } label: {
                        Text(s)
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(UIColor.tertiarySystemGroupedBackground))
                            .foregroundColor(.palmPrimary)
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmBorder, lineWidth: 1))
                    }
                }
            }
            .padding(.horizontal, 24)

            Spacer().frame(height: 24)
        }
    }

    private func messageBubble(_ msg: PalmAgentMessage) -> some View {
        HStack(alignment: .top, spacing: 8) {
            if msg.role == "user" { Spacer(minLength: 48) }

            if msg.role == "assistant" {
                Circle()
                    .fill(Color.palmPrimary.opacity(0.12))
                    .frame(width: 28, height: 28)
                    .overlay(
                        Image(systemName: "sparkles")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.palmPrimary)
                    )
            }

            Text(LocalizedStringKey(msg.content))
                .font(.subheadline)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(msg.role == "user" ? Color.palmPrimary : Color(UIColor.tertiarySystemGroupedBackground))
                .foregroundColor(msg.role == "user" ? .white : .primary)
                .cornerRadius(16)

            if msg.role == "assistant" { Spacer(minLength: 48) }
        }
        .padding(.horizontal, 12)
    }

    private var inputBar: some View {
        VStack(spacing: 0) {
            Divider()
            HStack(spacing: 10) {
                TextField("Ask Palm anything...", text: $vm.input)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color(UIColor.tertiarySystemGroupedBackground))
                    .cornerRadius(20)
                    .submitLabel(.send)
                    .onSubmit { Task { await vm.send(api: api) } }
                    .disabled(vm.isLoading)

                Button {
                    Task { await vm.send(api: api) }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(vm.input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .palmSecondary.opacity(0.3) : .palmPrimary)
                }
                .disabled(vm.isLoading || vm.input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(UIColor.systemBackground))
        }
    }
}

// MARK: - Flow Layout for suggestion chips

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layoutSubviews(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layoutSubviews(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func layoutSubviews(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            totalHeight = y + rowHeight
        }

        return (CGSize(width: maxWidth, height: totalHeight), positions)
    }
}

