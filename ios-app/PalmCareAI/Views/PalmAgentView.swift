import SwiftUI
import AVFoundation
import Speech

struct PalmAgentMessage: Identifiable {
    let id = UUID()
    let role: String
    let content: String
    let files: [AgentFile]

    init(role: String, content: String, files: [AgentFile] = []) {
        self.role = role
        self.content = content
        self.files = files
    }
}

struct AgentFile: Codable {
    let url: String
    let filename: String
    let format: String?
}

struct AgentResponse: Codable {
    let response: String
    let tool_calls: [AgentToolCall]?
    let files: [AgentFile]?

    struct AgentToolCall: Codable {
        let tool: String?
        enum CodingKeys: String, CodingKey { case tool }
        init(from decoder: Decoder) throws {
            let container = try? decoder.container(keyedBy: CodingKeys.self)
            tool = try? container?.decode(String.self, forKey: .tool)
        }
    }
}

@MainActor
class PalmAgentViewModel: ObservableObject {
    @Published var messages: [PalmAgentMessage] = []
    @Published var input = ""
    @Published var isLoading = false
    @Published var isListening = false
    @Published var isSpeaking = false
    @Published var ttsEnabled = true

    private var audioPlayer: AVAudioPlayer?
    private var speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()

    func send(api: APIService) async {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isLoading else { return }
        input = ""
        if isListening { stopListening() }
        messages.append(PalmAgentMessage(role: "user", content: text))
        isLoading = true
        defer { isLoading = false }

        let history: [[String: Any]] = messages.suffix(20).map { ["role": $0.role, "content": $0.content] }
        let body: [String: Any] = ["message": text, "history": history]

        do {
            let result: AgentResponse = try await api.request("POST", path: "/platform/agent/chat", body: body)
            let files = result.files ?? []
            messages.append(PalmAgentMessage(role: "assistant", content: result.response, files: files))
            if ttsEnabled { await speak(text: result.response, api: api) }
        } catch {
            messages.append(PalmAgentMessage(role: "assistant", content: "Something went wrong: \(error.localizedDescription)"))
        }
    }

    func speak(text: String, api: APIService) async {
        let clean = text.replacingOccurrences(of: "[*#|`_\\[\\]()]", with: "", options: .regularExpression)
        guard clean.count > 5 else { return }
        let trimmed = String(clean.prefix(4096))
        isSpeaking = true
        defer { isSpeaking = false }

        do {
            let audioData = try await api.rawRequest("POST", path: "/platform/agent/tts",
                                                      jsonBody: ["text": trimmed, "voice": "nova"])
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            audioPlayer = try AVAudioPlayer(data: audioData)
            audioPlayer?.play()
            while audioPlayer?.isPlaying == true {
                try? await Task.sleep(nanoseconds: 200_000_000)
            }
        } catch {
            // TTS failed silently — text is still visible
        }
    }

    func stopSpeaking() {
        audioPlayer?.stop()
        audioPlayer = nil
        isSpeaking = false
    }

    func toggleListening() {
        if isListening {
            stopListening()
        } else {
            startListening()
        }
    }

    private func startListening() {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            Task { @MainActor in
                guard status == .authorized else { return }
                self?.beginRecognition()
            }
        }
    }

    private func beginRecognition() {
        recognitionTask?.cancel()
        recognitionTask = nil

        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try? session.setActive(true, options: .notifyOthersOnDeactivation)

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest, let speechRecognizer = speechRecognizer else { return }
        recognitionRequest.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        try? audioEngine.start()
        isListening = true

        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            Task { @MainActor in
                if let result = result {
                    self?.input = result.bestTranscription.formattedString
                }
                if error != nil || (result?.isFinal == true) {
                    self?.stopListening()
                }
            }
        }
    }

    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        isListening = false
    }
}

// MARK: - Views

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
        isAdmin
            ? ["What are my outreach stats?", "Send all agency emails", "Export billing report", "Generate a summary document"]
            : ["List my clients", "Show my pending tasks", "Export a contract", "Create a care plan document"]
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
                    Button("Close") { isPresented = false; vm.stopSpeaking(); vm.stopListening() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 12) {
                        Button {
                            vm.ttsEnabled.toggle()
                            if !vm.ttsEnabled { vm.stopSpeaking() }
                        } label: {
                            Image(systemName: vm.ttsEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill")
                                .foregroundColor(vm.ttsEnabled ? .palmPrimary : .palmSecondary)
                        }
                        Button("Clear") { vm.messages.removeAll(); vm.stopSpeaking() }
                            .foregroundColor(.red)
                            .disabled(vm.messages.isEmpty)
                    }
                }
            }
        }
    }

    private var messagesArea: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    if vm.messages.isEmpty { welcomeView }

                    ForEach(vm.messages) { msg in
                        messageBubble(msg).id(msg.id)
                    }

                    if vm.isLoading {
                        HStack(spacing: 6) {
                            ProgressView().tint(.palmPrimary)
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
                    if let last = vm.messages.last { proxy.scrollTo(last.id, anchor: .bottom) }
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

            Text("Type or tap the mic to talk. I can generate documents, manage clients, and more.")
                .font(.subheadline)
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            FlowLayout(spacing: 8) {
                ForEach(suggestions, id: \.self) { s in
                    Button { vm.input = s } label: {
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

            VStack(alignment: msg.role == "user" ? .trailing : .leading, spacing: 6) {
                Text(LocalizedStringKey(msg.content))
                    .font(.subheadline)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(msg.role == "user" ? Color.palmPrimary : Color(UIColor.tertiarySystemGroupedBackground))
                    .foregroundColor(msg.role == "user" ? .white : .primary)
                    .cornerRadius(16)

                ForEach(msg.files, id: \.filename) { file in
                    HStack(spacing: 8) {
                        Image(systemName: "doc.fill")
                            .foregroundColor(.palmPrimary)
                        Text(file.filename)
                            .font(.caption)
                            .foregroundColor(.palmPrimary)
                            .lineLimit(1)
                        Spacer()
                        Image(systemName: "arrow.down.circle.fill")
                            .foregroundColor(.palmPrimary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.palmPrimary.opacity(0.08))
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmPrimary.opacity(0.2), lineWidth: 1))
                }
            }

            if msg.role == "assistant" { Spacer(minLength: 48) }
        }
        .padding(.horizontal, 12)
    }

    private var inputBar: some View {
        VStack(spacing: 0) {
            if vm.isSpeaking {
                HStack(spacing: 8) {
                    ForEach(0..<4, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.palmPrimary)
                            .frame(width: 3, height: CGFloat.random(in: 6...16))
                    }
                    Text("Speaking...")
                        .font(.caption2)
                        .foregroundColor(.palmPrimary)
                    Spacer()
                    Button("Stop") { vm.stopSpeaking() }
                        .font(.caption2)
                        .foregroundColor(.red)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
            }

            Divider()
            HStack(spacing: 10) {
                Button { vm.toggleListening() } label: {
                    Image(systemName: vm.isListening ? "mic.fill" : "mic")
                        .font(.system(size: 20))
                        .foregroundColor(vm.isListening ? .white : .palmSecondary)
                        .frame(width: 36, height: 36)
                        .background(vm.isListening ? Color.red : Color(UIColor.tertiarySystemGroupedBackground))
                        .cornerRadius(18)
                }

                TextField(vm.isListening ? "Listening..." : "Ask Palm anything...", text: $vm.input)
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

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        layoutSubviews(proposal: proposal, subviews: subviews).size
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
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, totalHeight: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            totalHeight = y + rowHeight
        }
        return (CGSize(width: maxWidth, height: totalHeight), positions)
    }
}
