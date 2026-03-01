import SwiftUI
import AVFoundation

// MARK: - Animated Voice Orb (Deepgram-inspired)

struct VoiceOrb: View {
    let isActive: Bool
    let audioLevel: Float

    @State private var rotation: Double = 0
    @State private var morphPhase: CGFloat = 0

    private var normalizedLevel: CGFloat {
        CGFloat(max(0, min(1, audioLevel)))
    }

    var body: some View {
        ZStack {
            // Outer glow rings
            ForEach(0..<3, id: \.self) { ring in
                OrbRing(
                    phase: morphPhase + CGFloat(ring) * 0.7,
                    audioLevel: normalizedLevel,
                    ringIndex: ring
                )
                .frame(width: orbSize(for: ring), height: orbSize(for: ring))
                .rotationEffect(.degrees(rotation + Double(ring) * 40))
            }

            // Core orb
            OrbShape(phase: morphPhase, audioLevel: normalizedLevel)
                .fill(
                    AngularGradient(
                        colors: isActive
                            ? [
                                Color.palmPrimary,
                                Color.palmAccent,
                                Color(red: 139/255, green: 92/255, blue: 246/255),
                                Color.palmPrimaryLight,
                                Color.palmPrimary,
                            ]
                            : [
                                Color.palmPrimary.opacity(0.7),
                                Color.palmAccent.opacity(0.5),
                                Color.palmPrimaryDark.opacity(0.6),
                                Color.palmPrimary.opacity(0.7),
                            ],
                        center: .center
                    )
                )
                .frame(width: 140, height: 140)
                .shadow(color: Color.palmPrimary.opacity(isActive ? 0.6 : 0.3), radius: isActive ? 30 : 15, y: 0)
                .overlay(
                    OrbShape(phase: morphPhase, audioLevel: normalizedLevel)
                        .fill(
                            RadialGradient(
                                colors: [.white.opacity(0.25), .clear],
                                center: .topLeading,
                                startRadius: 0,
                                endRadius: 80
                            )
                        )
                        .frame(width: 140, height: 140)
                )

            // Center icon
            if isActive {
                // Animated waveform bars
                HStack(spacing: 3) {
                    ForEach(0..<5, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white)
                            .frame(width: 3, height: barHeight(for: i))
                    }
                }
            } else {
                Image(systemName: "mic.fill")
                    .font(.system(size: 36, weight: .medium))
                    .foregroundColor(.white)
            }
        }
        .onAppear {
            withAnimation(.linear(duration: 12).repeatForever(autoreverses: false)) {
                rotation = 360
            }
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                morphPhase = 1
            }
        }
    }

    private func orbSize(for ring: Int) -> CGFloat {
        let base: CGFloat = 170 + CGFloat(ring) * 30
        let pulse = isActive ? normalizedLevel * 15 : 0
        return base + pulse
    }

    private func barHeight(for index: Int) -> CGFloat {
        let base: CGFloat = 12
        let audioBoost = normalizedLevel * 24
        let variation = sin(morphPhase * .pi * 2 + CGFloat(index) * 1.2) * 8
        return max(6, base + audioBoost + variation)
    }
}

struct OrbShape: Shape {
    var phase: CGFloat
    var audioLevel: CGFloat

    var animatableData: AnimatablePair<CGFloat, CGFloat> {
        get { AnimatablePair(phase, audioLevel) }
        set { phase = newValue.first; audioLevel = newValue.second }
    }

    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2
        let points = 120
        var path = Path()

        for i in 0...points {
            let angle = CGFloat(i) / CGFloat(points) * .pi * 2
            let wobble1 = sin(angle * 3 + phase * .pi * 2) * (4 + audioLevel * 8)
            let wobble2 = cos(angle * 2 - phase * .pi * 1.5) * (3 + audioLevel * 6)
            let wobble3 = sin(angle * 5 + phase * .pi * 3) * (2 + audioLevel * 4)
            let r = radius + wobble1 + wobble2 + wobble3

            let point = CGPoint(
                x: center.x + r * cos(angle),
                y: center.y + r * sin(angle)
            )

            if i == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }
        path.closeSubpath()
        return path
    }
}

struct OrbRing: View {
    let phase: CGFloat
    let audioLevel: CGFloat
    let ringIndex: Int

    var body: some View {
        OrbShape(phase: phase, audioLevel: audioLevel * 0.5)
            .stroke(
                AngularGradient(
                    colors: ringColors,
                    center: .center
                ),
                lineWidth: ringIndex == 0 ? 2 : 1.5
            )
            .opacity(0.3 - Double(ringIndex) * 0.08)
    }

    private var ringColors: [Color] {
        switch ringIndex {
        case 0: return [Color.palmPrimary, Color.palmAccent, Color(red: 139/255, green: 92/255, blue: 246/255), Color.palmPrimary]
        case 1: return [Color.palmAccent, Color(red: 139/255, green: 92/255, blue: 246/255), Color.palmPrimaryLight, Color.palmAccent]
        default: return [Color(red: 139/255, green: 92/255, blue: 246/255), Color.palmPrimary, Color.palmAccent, Color(red: 139/255, green: 92/255, blue: 246/255)]
        }
    }
}

// MARK: - Waveform Visualizer (Deepgram-style)

struct WaveformBar: View {
    let level: Float
    let isActive: Bool

    var body: some View {
        RoundedRectangle(cornerRadius: 1)
            .fill(isActive ? Color.palmPrimary : Color.palmPrimary.opacity(0.3))
            .frame(width: 2, height: max(2, CGFloat(level) * 20))
    }
}

struct LiveWaveform: View {
    let audioLevel: Float
    let isRecording: Bool
    @State private var levels: [Float] = Array(repeating: 0.1, count: 50)

    var body: some View {
        HStack(spacing: 1.5) {
            ForEach(0..<levels.count, id: \.self) { i in
                WaveformBar(level: levels[i], isActive: i < Int(Float(levels.count) * 0.7))
            }
        }
        .frame(height: 24)
        .onChange(of: audioLevel) { newLevel in
            if isRecording {
                levels.removeFirst()
                levels.append(max(0.08, newLevel))
            }
        }
    }
}

// MARK: - Live Transcript Panel

struct TranscriptPanel: View {
    let segments: [TranscriptSegment]
    let isTranscribing: Bool
    let elapsedTime: TimeInterval
    let audioLevel: Float
    let isRecording: Bool

    private static let speakerColors: [Color] = [
        Color.palmPrimary,
        Color(red: 59/255, green: 130/255, blue: 246/255),
        Color(red: 139/255, green: 92/255, blue: 246/255),
        Color(red: 217/255, green: 119/255, blue: 6/255),
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Header bar (Deepgram-style)
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.palmPrimary)

                    Text("PalmCare AI")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                }

                Spacer()

                HStack(spacing: 6) {
                    Text("Live Assessment")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.white.opacity(0.6))

                    if isTranscribing {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 6, height: 6)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(red: 24/255, green: 24/255, blue: 27/255))

            // Waveform + timer bar
            HStack(spacing: 10) {
                Text(formatTime(elapsedTime))
                    .font(.system(size: 11, weight: .medium).monospacedDigit())
                    .foregroundColor(.palmPrimary)

                LiveWaveform(audioLevel: audioLevel, isRecording: isRecording)

                Text(formatTime(max(0, elapsedTime)))
                    .font(.system(size: 11, weight: .medium).monospacedDigit())
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color(red: 30/255, green: 30/255, blue: 33/255))

            // Transcript content
            ScrollViewReader { proxy in
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 14) {
                        if segments.isEmpty && isTranscribing {
                            HStack(spacing: 8) {
                                ProgressView()
                                    .tint(.palmPrimary)
                                    .scaleEffect(0.8)
                                Text("Listening...")
                                    .font(.system(size: 13))
                                    .foregroundColor(.white.opacity(0.5))
                            }
                            .padding(.top, 20)
                            .frame(maxWidth: .infinity, alignment: .center)
                        } else if segments.isEmpty {
                            VStack(spacing: 8) {
                                Image(systemName: "waveform")
                                    .font(.system(size: 28))
                                    .foregroundColor(.white.opacity(0.2))
                                Text("Start recording to see live transcription")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.35))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 30)
                        }

                        ForEach(segments) { segment in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 6) {
                                    Circle()
                                        .fill(speakerColor(for: segment.speaker))
                                        .frame(width: 8, height: 8)

                                    Text(segment.speakerLabel + ":")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(speakerColor(for: segment.speaker))
                                }

                                HighlightedText(text: segment.text)
                            }
                            .id(segment.id)
                        }
                    }
                    .padding(14)
                }
                .onChange(of: segments.count) { _ in
                    if let last = segments.last {
                        withAnimation(.easeOut(duration: 0.3)) {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }
            .frame(maxHeight: .infinity)
            .background(Color(red: 39/255, green: 39/255, blue: 42/255))
        }
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.3), radius: 12, y: 4)
    }

    private func speakerColor(for speaker: Int) -> Color {
        Self.speakerColors[speaker % Self.speakerColors.count]
    }

    private func formatTime(_ interval: TimeInterval) -> String {
        let m = Int(interval) / 60
        let s = Int(interval) % 60
        return String(format: "%02d:%02d", m, s)
    }
}

// MARK: - Highlighted Text (medical keywords)

struct HighlightedText: View {
    let text: String

    var body: some View {
        let words = text.split(separator: " ").map(String.init)
        let result = buildAttributedWords(words)
        return result
    }

    @ViewBuilder
    private func buildAttributedWords(_ words: [String]) -> some View {
        WrappingHStack(words: words)
    }
}

struct WrappingHStack: View {
    let words: [String]

    var body: some View {
        var text = Text("")
        for (i, word) in words.enumerated() {
            let isKeyword = LiveTranscriptionService.isMedicalKeyword(word)
            let separator = i > 0 ? Text(" ") : Text("")
            if isKeyword {
                text = text + separator + Text(word)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmPrimaryLight)
            } else {
                text = text + separator + Text(word)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.88))
            }
        }
        return text
            .lineSpacing(4)
    }
}

// MARK: - Main Record View

struct RecordView: View {
    @EnvironmentObject var api: APIService
    @StateObject private var recorder = AudioRecorderService()
    @State private var liveTranscription: LiveTranscriptionService?

    @State private var clients: [Client] = []
    @State private var selectedClient: Client?
    @State private var showClientPicker = false
    @State private var permissionGranted = false
    @State private var showPermissionAlert = false
    @State private var isUploading = false
    @State private var uploadSuccess = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var recordingFinishedURL: URL?
    @State private var uploadStatusMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                // Dark background
                Color(red: 12/255, green: 12/255, blue: 14/255)
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Top bar
                    topBar
                        .padding(.bottom, 8)

                    if recorder.isRecording || !transcriptSegments.isEmpty {
                        recordingLayout
                    } else if recordingFinishedURL != nil {
                        finishedLayout
                    } else {
                        idleLayout
                    }
                }
            }
            .sheet(isPresented: $showClientPicker) {
                ClientPickerSheet(clients: clients, selected: $selectedClient)
            }
            .alert("Microphone Access", isPresented: $showPermissionAlert) {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("PalmCareAI needs microphone access to record visits. Please enable it in Settings.")
            }
            .alert("Upload Successful", isPresented: $uploadSuccess) {
                Button("OK") { discardRecording() }
            } message: {
                Text("Your recording has been uploaded and the AI pipeline is processing it.")
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "An error occurred.")
            }
            .task {
                await loadClients()
                permissionGranted = await recorder.requestPermission()
            }
            .onAppear {
                if liveTranscription == nil {
                    liveTranscription = LiveTranscriptionService(api: api)
                }
            }
        }
    }

    private var transcriptSegments: [TranscriptSegment] {
        liveTranscription?.segments ?? []
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            // Client selector
            Button { showClientPicker = true } label: {
                HStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(Color.palmPrimary.opacity(0.15))
                            .frame(width: 28, height: 28)
                        Image(systemName: "person.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.palmPrimary)
                    }

                    Text(selectedClient?.full_name ?? "Select Client")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(selectedClient != nil ? .white : .white.opacity(0.5))
                        .lineLimit(1)

                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white.opacity(0.4))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.white.opacity(0.06))
                .cornerRadius(20)
                .overlay(
                    Capsule().stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
            }

            Spacer()

            // Timer
            if recorder.isRecording {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 7, height: 7)

                    Text(timeString(recorder.duration))
                        .font(.system(size: 14, weight: .bold).monospacedDigit())
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.red.opacity(0.15))
                .cornerRadius(16)
                .overlay(Capsule().stroke(Color.red.opacity(0.3), lineWidth: 1))
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }

    // MARK: - Idle Layout (before recording)

    private var idleLayout: some View {
        VStack(spacing: 0) {
            Spacer()

            // Orb
            VoiceOrb(isActive: false, audioLevel: 0)
                .frame(width: 240, height: 240)
                .onTapGesture { handleRecordTap() }

            Text("Tap to start recording")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.palmPrimaryLight)
                .padding(.top, 16)

            Text("AI handles the rest")
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.4))
                .padding(.top, 4)

            Spacer()

            // Bottom info
            HStack(spacing: 16) {
                FeaturePill(icon: "waveform", text: "Live Transcription")
                FeaturePill(icon: "person.2", text: "Speaker ID")
                FeaturePill(icon: "doc.text", text: "Auto Contract")
            }
            .padding(.bottom, 90)
        }
    }

    // MARK: - Recording Layout (orb + transcript)

    private var recordingLayout: some View {
        VStack(spacing: 12) {
            // Compact orb
            VoiceOrb(isActive: true, audioLevel: recorder.audioLevel)
                .frame(width: 120, height: 120)
                .onTapGesture { handleRecordTap() }

            Text("Tap orb to stop")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white.opacity(0.4))

            // Live transcript panel
            TranscriptPanel(
                segments: transcriptSegments,
                isTranscribing: liveTranscription?.isTranscribing ?? false,
                elapsedTime: recorder.duration,
                audioLevel: recorder.audioLevel,
                isRecording: recorder.isRecording
            )
            .padding(.horizontal, 14)

            Spacer().frame(height: 80)
        }
    }

    // MARK: - Finished Layout (after recording, before upload)

    private var finishedLayout: some View {
        VStack(spacing: 0) {
            // Show transcript if we have one
            if !transcriptSegments.isEmpty {
                TranscriptPanel(
                    segments: transcriptSegments,
                    isTranscribing: false,
                    elapsedTime: recorder.duration,
                    audioLevel: 0,
                    isRecording: false
                )
                .padding(.horizontal, 14)
                .padding(.top, 8)
            } else {
                Spacer()

                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color.palmPrimary.opacity(0.1))
                            .frame(width: 80, height: 80)
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.palmPrimary)
                    }

                    Text("Recording Complete")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)

                    Text(timeString(recorder.duration))
                        .font(.system(size: 14).monospacedDigit())
                        .foregroundColor(.white.opacity(0.5))
                }
            }

            Spacer()

            // Upload section
            VStack(spacing: 10) {
                if let statusMsg = uploadStatusMessage {
                    HStack(spacing: 6) {
                        ProgressView().tint(.palmPrimary).scaleEffect(0.7)
                        Text(statusMsg)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.palmPrimary)
                    }
                }

                Button { uploadRecording() } label: {
                    HStack(spacing: 8) {
                        if isUploading {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 18))
                        }
                        Text(isUploading ? "Processing..." : "Upload & Process")
                            .font(.system(size: 14, weight: .heavy))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [Color.palmPrimary, Color.palmAccent],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(14)
                    .shadow(color: Color.palmPrimary.opacity(0.4), radius: 10, y: 4)
                }
                .disabled(isUploading || selectedClient == nil)
                .opacity(selectedClient == nil ? 0.5 : 1)

                if selectedClient == nil {
                    Text("Select a client above before uploading")
                        .font(.system(size: 11))
                        .foregroundColor(.orange.opacity(0.8))
                }

                Button { discardRecording() } label: {
                    Text("Discard Recording")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.red.opacity(0.8))
                }
                .padding(.top, 4)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 90)
        }
    }

    // MARK: - Feature Pill

    struct FeaturePill: View {
        let icon: String
        let text: String

        var body: some View {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                Text(text)
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundColor(.white.opacity(0.35))
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.04))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
            )
        }
    }

    // MARK: - Actions

    private func handleRecordTap() {
        if recorder.isRecording {
            let url = recorder.stopRecording()
            recordingFinishedURL = url
            liveTranscription?.stopTranscribing()
        } else {
            if !permissionGranted {
                permissionGranted = recorder.checkPermissionStatus()
            }
            guard permissionGranted else {
                showPermissionAlert = true
                return
            }
            recordingFinishedURL = nil
            uploadStatusMessage = nil
            liveTranscription?.segments = []
            do {
                try recorder.startRecording()
                if let url = recorder.recordingURL {
                    liveTranscription?.startTranscribing(recordingURL: url)
                }
            } catch {
                errorMessage = "Failed to start recording: \(error.localizedDescription)"
                showError = true
            }
        }
    }

    private func uploadRecording() {
        guard let url = recordingFinishedURL,
              let clientId = selectedClient?.id
        else { return }

        isUploading = true
        uploadStatusMessage = "Creating visit..."

        Task {
            do {
                let visit = try await api.createVisit(clientId: clientId)
                await MainActor.run { uploadStatusMessage = "Uploading audio..." }

                let data = try Data(contentsOf: url)
                let filename = url.lastPathComponent
                _ = try await api.uploadAudio(visitId: visit.id, audioData: data, filename: filename, autoProcess: true)

                await MainActor.run {
                    isUploading = false
                    uploadStatusMessage = nil
                    uploadSuccess = true
                }
            } catch {
                await MainActor.run {
                    isUploading = false
                    uploadStatusMessage = nil
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }

    private func discardRecording() {
        if let url = recordingFinishedURL {
            try? FileManager.default.removeItem(at: url)
        }
        recordingFinishedURL = nil
        recorder.recordingURL = nil
        uploadStatusMessage = nil
        liveTranscription?.segments = []
        liveTranscription?.fullTranscript = ""
    }

    private func loadClients() async {
        do {
            let fetched = try await api.fetchClients()
            await MainActor.run { clients = fetched }
        } catch {
            print("Failed to load clients: \(error.localizedDescription)")
        }
    }

    private func timeString(_ interval: TimeInterval) -> String {
        let m = Int(interval) / 60
        let s = Int(interval) % 60
        return String(format: "%02d:%02d", m, s)
    }
}

// MARK: - Client Picker Sheet

struct ClientPickerSheet: View {
    let clients: [Client]
    @Binding var selected: Client?
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    var filtered: [Client] {
        if search.isEmpty { return clients }
        return clients.filter { $0.full_name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            List(filtered) { client in
                Button {
                    selected = client
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(client.full_name)
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.palmText)

                            if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                                Text(diagnosis)
                                    .font(.caption)
                                    .foregroundColor(.palmSecondary)
                            }

                            if let phone = client.phone {
                                Text(phone)
                                    .font(.caption)
                                    .foregroundColor(.palmSecondary)
                            }
                        }

                        Spacer()

                        if selected?.id == client.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.palmPrimary)
                        }
                    }
                }
            }
            .searchable(text: $search, prompt: "Search clients")
            .navigationTitle("Select Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    RecordView()
        .environmentObject(APIService.shared)
}
