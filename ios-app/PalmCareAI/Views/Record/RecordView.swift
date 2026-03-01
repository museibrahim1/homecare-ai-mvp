import SwiftUI
import AVFoundation

// MARK: - Animated Voice Orb

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
            ForEach(0..<3, id: \.self) { ring in
                OrbRing(
                    phase: morphPhase + CGFloat(ring) * 0.7,
                    audioLevel: normalizedLevel,
                    ringIndex: ring
                )
                .frame(width: orbSize(for: ring), height: orbSize(for: ring))
                .rotationEffect(.degrees(rotation + Double(ring) * 40))
            }

            OrbShape(phase: morphPhase, audioLevel: normalizedLevel)
                .fill(
                    AngularGradient(
                        colors: isActive
                            ? [Color.palmPrimary, Color.palmAccent, Color.palmPurple, Color.palmPrimaryLight, Color.palmPrimary]
                            : [Color.palmPrimary.opacity(0.7), Color.palmAccent.opacity(0.5), Color.palmPrimaryDark.opacity(0.6), Color.palmPrimary.opacity(0.7)],
                        center: .center
                    )
                )
                .frame(width: 140, height: 140)
                .shadow(color: Color.palmPrimary.opacity(isActive ? 0.6 : 0.3), radius: isActive ? 30 : 15, y: 0)
                .overlay(
                    OrbShape(phase: morphPhase, audioLevel: normalizedLevel)
                        .fill(RadialGradient(colors: [.white.opacity(0.25), .clear], center: .topLeading, startRadius: 0, endRadius: 80))
                        .frame(width: 140, height: 140)
                )

            if isActive {
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
            withAnimation(.linear(duration: 12).repeatForever(autoreverses: false)) { rotation = 360 }
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) { morphPhase = 1 }
        }
    }

    private func orbSize(for ring: Int) -> CGFloat {
        let base: CGFloat = 170 + CGFloat(ring) * 30
        return base + (isActive ? normalizedLevel * 15 : 0)
    }

    private func barHeight(for index: Int) -> CGFloat {
        max(6, 12 + normalizedLevel * 24 + sin(morphPhase * .pi * 2 + CGFloat(index) * 1.2) * 8)
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
            let r = radius
                + sin(angle * 3 + phase * .pi * 2) * (4 + audioLevel * 8)
                + cos(angle * 2 - phase * .pi * 1.5) * (3 + audioLevel * 6)
                + sin(angle * 5 + phase * .pi * 3) * (2 + audioLevel * 4)
            let point = CGPoint(x: center.x + r * cos(angle), y: center.y + r * sin(angle))
            if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
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
            .stroke(AngularGradient(colors: ringColors, center: .center), lineWidth: ringIndex == 0 ? 2 : 1.5)
            .opacity(0.3 - Double(ringIndex) * 0.08)
    }

    private var ringColors: [Color] {
        switch ringIndex {
        case 0: return [Color.palmPrimary, Color.palmAccent, Color.palmPurple, Color.palmPrimary]
        case 1: return [Color.palmAccent, Color.palmPurple, Color.palmPrimaryLight, Color.palmAccent]
        default: return [Color.palmPurple, Color.palmPrimary, Color.palmAccent, Color.palmPurple]
        }
    }
}

// MARK: - Highlighted Text

struct WrappingHStack: View {
    let words: [String]

    var body: some View {
        var text = Text("")
        for (i, word) in words.enumerated() {
            let sep = i > 0 ? Text(" ") : Text("")
            if LiveTranscriptionService.isMedicalKeyword(word) {
                text = text + sep + Text(word)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmPrimaryLight)
            } else {
                text = text + sep + Text(word)
                    .font(.system(size: 15))
                    .foregroundColor(.white.opacity(0.88))
            }
        }
        return text.lineSpacing(5)
    }
}

// MARK: - Speaker Colors

private let speakerColors: [Color] = [
    Color.palmPrimary,
    Color.palmBlue,
    Color.palmPurple,
    Color.palmOrange,
]

private func speakerColor(for speaker: Int) -> Color {
    speakerColors[speaker % speakerColors.count]
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
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var isProcessing = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 12/255, green: 12/255, blue: 14/255)
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    topBar
                    
                    if recorder.isRecording {
                        recordingLayout
                    } else {
                        idleLayout
                    }
                }

                // Processing toast
                if isProcessing {
                    VStack {
                        Spacer()
                        HStack(spacing: 10) {
                            ProgressView().tint(.white).scaleEffect(0.8)
                            Text("Generating contract...")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(Color.palmPrimary.opacity(0.9))
                        .cornerRadius(24)
                        .shadow(color: Color.palmPrimary.opacity(0.4), radius: 10, y: 4)
                        .padding(.bottom, 100)
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
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
                .overlay(Capsule().stroke(Color.white.opacity(0.1), lineWidth: 1))
            }

            Spacer()

            if recorder.isRecording {
                HStack(spacing: 6) {
                    Circle().fill(Color.red).frame(width: 7, height: 7)
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
        .padding(.bottom, 4)
    }

    // MARK: - Idle Layout

    private var idleLayout: some View {
        VStack(spacing: 0) {
            Spacer()

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

            HStack(spacing: 16) {
                FeaturePill(icon: "waveform", text: "Live Transcription")
                FeaturePill(icon: "person.2", text: "Speaker ID")
                FeaturePill(icon: "doc.text", text: "Auto Contract")
            }
            .padding(.bottom, 90)
        }
    }

    // MARK: - Recording Layout (orb + raw dialogue)

    private var recordingLayout: some View {
        VStack(spacing: 0) {
            VoiceOrb(isActive: true, audioLevel: recorder.audioLevel)
                .frame(width: 120, height: 120)
                .onTapGesture { handleRecordTap() }
                .padding(.top, 4)
                .padding(.bottom, 12)

            // Live dialogue — just text, no box, no chrome
            ScrollViewReader { proxy in
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(transcriptSegments) { segment in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 6) {
                                    Circle()
                                        .fill(speakerColor(for: segment.speaker))
                                        .frame(width: 8, height: 8)
                                    Text(segment.speakerLabel)
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(speakerColor(for: segment.speaker))
                                }

                                WrappingHStack(words: segment.text.split(separator: " ").map(String.init))
                            }
                            .id(segment.id)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 100)
                }
                .onChange(of: transcriptSegments.count) { _ in
                    if let last = transcriptSegments.last {
                        withAnimation(.easeOut(duration: 0.3)) {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Feature Pill

    struct FeaturePill: View {
        let icon: String
        let text: String

        var body: some View {
            HStack(spacing: 4) {
                Image(systemName: icon).font(.system(size: 10))
                Text(text).font(.system(size: 10, weight: .medium))
            }
            .foregroundColor(.white.opacity(0.35))
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.04))
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.06), lineWidth: 1))
        }
    }

    // MARK: - Actions

    private func handleRecordTap() {
        if recorder.isRecording {
            stopAndProcess()
        } else {
            startRecording()
        }
    }

    private func startRecording() {
        if !permissionGranted {
            permissionGranted = recorder.checkPermissionStatus()
        }
        guard permissionGranted else {
            showPermissionAlert = true
            return
        }
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

    private func stopAndProcess() {
        let url = recorder.stopRecording()
        liveTranscription?.stopTranscribing()

        guard let audioURL = url, let clientId = selectedClient?.id else {
            if selectedClient == nil {
                errorMessage = "Please select a client before stopping. Your recording was saved."
                showError = true
            }
            liveTranscription?.segments = []
            return
        }

        liveTranscription?.segments = []

        withAnimation { isProcessing = true }

        Task {
            do {
                let visit = try await api.createVisit(clientId: clientId)
                let data = try Data(contentsOf: audioURL)
                _ = try await api.uploadAudio(visitId: visit.id, audioData: data, filename: audioURL.lastPathComponent, autoProcess: true)
                try? FileManager.default.removeItem(at: audioURL)

                await MainActor.run {
                    withAnimation { isProcessing = false }
                }
            } catch {
                await MainActor.run {
                    withAnimation { isProcessing = false }
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }

    private func loadClients() async {
        do {
            let fetched = try await api.fetchClients()
            await MainActor.run { clients = fetched }
        } catch {}
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
                                Text(diagnosis).font(.caption).foregroundColor(.palmSecondary)
                            }
                            if let phone = client.phone {
                                Text(phone).font(.caption).foregroundColor(.palmSecondary)
                            }
                        }
                        Spacer()
                        if selected?.id == client.id {
                            Image(systemName: "checkmark.circle.fill").foregroundColor(.palmPrimary)
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
