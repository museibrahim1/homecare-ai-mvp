import SwiftUI
import AVFoundation
import UniformTypeIdentifiers

struct RecordView: View {
    @EnvironmentObject var api: APIService
    @StateObject private var recorder = AudioRecorderService()
    @State private var liveTranscription: LiveTranscriptionService?
    @State private var liveSegments: [TranscriptSegment] = []
    @State private var liveFullTranscript = ""
    #if DEBUG
    @StateObject private var demoTranscription = DemoTranscriptionService()
    @State private var isDemoMode = false
    #endif

    @State private var clients: [Client] = []
    @State private var selectedClient: Client?
    @State private var showClientPicker = false
    @State private var permissionGranted = false
    @State private var showPermissionAlert = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var isProcessing = false
    @State private var showFilePicker = false
    @State private var uploadProgress: String?
    @AppStorage("backgroundRecording") private var backgroundRecording = false
    @AppStorage("assessmentInProgress") private var assessmentInProgress = false

    @State private var completedVisitId: String?
    @State private var pipelineFailed = false
    @State private var completedClientName: String?
    @State private var navigateToVisit = false
    /// Holds a finished recording when the user stopped without selecting a
    /// client, so it can be processed once a client is chosen (no lost audio).
    @State private var pendingAudioURL: URL?
    @State private var pipelineSteps: [(String, String)] = []
    #if DEBUG
    @State private var didRunAutomationDemo = false
    #endif

    var body: some View {
            ZStack {
                Color(red: 12/255, green: 12/255, blue: 14/255)
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    topBar
                    
                    #if DEBUG
                    if isDemoMode || recorder.isRecording {
                        recordingLayout
                    } else {
                        idleLayout
                    }
                    #else
                    if recorder.isRecording {
                        recordingLayout
                    } else {
                        idleLayout
                    }
                    #endif
                }

                // Processing overlay with pipeline progress
                if isProcessing {
                    VStack {
                        Spacer()
                        VStack(spacing: 12) {
                            HStack(spacing: 10) {
                                ProgressView().tint(.white).scaleEffect(0.8)
                                Text(uploadProgress ?? "Processing assessment...")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white)
                            }

                            if !pipelineSteps.isEmpty {
                                VStack(spacing: 6) {
                                    ForEach(pipelineSteps, id: \.0) { step, status in
                                        HStack(spacing: 8) {
                                            pipelineIcon(for: status)
                                                .frame(width: 14, height: 14)
                                            Text(step)
                                                .font(.system(size: 11, weight: .medium))
                                                .foregroundColor(.white.opacity(0.85))
                                            Spacer()
                                            Text(status.capitalized)
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(pipelineColor(for: status))
                                        }
                                    }
                                }
                                .padding(.top, 4)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 14)
                        .background(Color(red: 20/255, green: 20/255, blue: 24/255).opacity(0.95))
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmPrimary.opacity(0.3), lineWidth: 1))
                        .shadow(color: Color.black.opacity(0.4), radius: 10, y: 4)
                        .padding(.horizontal, 20)
                        .padding(.bottom, 100)
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                // Phone call / Siri interruption banner — recording is paused
                // by the system and will resume automatically when it ends.
                if recorder.isRecording && recorder.isInterrupted {
                    VStack {
                        HStack(spacing: 10) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.palmOrange)
                            Text("Recording paused by a call — it will resume automatically.")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color(red: 40/255, green: 28/255, blue: 12/255).opacity(0.95))
                        .cornerRadius(14)
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmOrange.opacity(0.4), lineWidth: 1))
                        .padding(.horizontal, 20)
                        .padding(.top, 70)
                        Spacer()
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }

            }
            .navigationDestination(isPresented: $navigateToVisit) {
                // Open straight to the Contract tab — the finished assessment
                // lands the caregiver on the generated contract automatically,
                // matching the web app's behavior. If a step failed there is
                // no contract to show, so land on Overview where the detail
                // view surfaces what happened.
                VisitDetailView(
                    visitId: completedVisitId ?? "",
                    clientName: completedClientName,
                    initialTab: pipelineFailed ? 0 : 4
                )
                .environmentObject(api)
            }
            .sheet(isPresented: $showClientPicker) {
                ClientPickerSheet(clients: clients, selected: $selectedClient, onClientAdded: { newClient in
                    clients.insert(newClient, at: 0)
                })
                .environmentObject(api)
            }
            .palmConfirmAlert(
                "Microphone Access",
                message: "PalmCareAI needs microphone access to record visits. Please enable it in Settings.",
                icon: "mic.slash.fill",
                iconColor: .palmOrange,
                isPresented: $showPermissionAlert,
                confirmTitle: "Open Settings",
                confirmStyle: .primary,
                onConfirm: {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
            )
            .palmErrorAlert(message: $errorMessage, isPresented: $showError)
            .sheet(isPresented: $showFilePicker) {
                AudioFilePicker { url in
                    handlePickedAudioFile(url)
                }
            }
            .task {
                permissionGranted = await recorder.requestPermission()
                await loadClients()
            }
            #if DEBUG
            .task {
                guard ProcessInfo.processInfo.arguments.contains("AUTOMATION_STRESS_FLOW") else { return }
                guard !didRunAutomationDemo else { return }
                didRunAutomationDemo = true
                isDemoMode = true
                demoTranscription.startTranscribing()
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                demoTranscription.stopTranscribing()
                isDemoMode = false
            }
            .task {
                guard ProcessInfo.processInfo.arguments.contains("MARKETING_DEMO_FLOW") else { return }
                guard !didRunAutomationDemo else { return }
                didRunAutomationDemo = true
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                if let john = clients.first(where: { $0.full_name.lowercased().contains("john") }) {
                    selectedClient = john
                }
                try? await Task.sleep(nanoseconds: 1_500_000_000)
                isDemoMode = true
                demoTranscription.startTranscribing()
            }
            #endif
            .onAppear {
                if liveTranscription == nil {
                    liveTranscription = LiveTranscriptionService(api: api)
                }
                assessmentInProgress = recorder.isRecording || isProcessing
            }
            .onReceive(Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()) { _ in
                guard let lt = liveTranscription, lt.isTranscribing else { return }
                if lt.segments.count != liveSegments.count || lt.fullTranscript != liveFullTranscript {
                    liveSegments = lt.segments
                    liveFullTranscript = lt.fullTranscript
                }
            }
            .onDisappear {
                if !recorder.isRecording && !isProcessing {
                    assessmentInProgress = false
                }
            }
            .onChange(of: recorder.isRecording) { isRecording in
                assessmentInProgress = isRecording || isProcessing
            }
            .onChange(of: isProcessing) { processing in
                assessmentInProgress = recorder.isRecording || processing
            }
            .onChange(of: selectedClient?.id) { clientId in
                // A recording was held because no client was selected at stop.
                // Now that one is chosen, process it.
                guard let audioURL = pendingAudioURL, let clientId,
                      let client = selectedClient else { return }
                pendingAudioURL = nil
                processRecording(audioURL: audioURL, clientId: clientId, clientName: client.full_name)
            }
            .onChange(of: showClientPicker) { isShowing in
                // Picker dismissed without choosing a client: don't keep PHI
                // audio lingering on device; clean up and let the user know.
                guard !isShowing, let audioURL = pendingAudioURL, selectedClient == nil else { return }
                pendingAudioURL = nil
                try? FileManager.default.removeItem(at: audioURL)
                errorMessage = "Recording discarded — no client was selected."
                showError = true
            }
            .onChange(of: recorder.recordingFailureMessage) { message in
                // System killed the recording (media daemon crash). Recover
                // the partial file through the normal upload path.
                guard let message else { return }
                recorder.recordingFailureMessage = nil
                liveTranscription?.stopTranscribing()
                if let url = recorder.recordingURL {
                    if let client = selectedClient {
                        processRecording(audioURL: url, clientId: client.id, clientName: client.full_name)
                    } else {
                        pendingAudioURL = url
                        showClientPicker = true
                    }
                }
                errorMessage = message
                showError = true
            }
    }

    private var transcriptSegments: [TranscriptSegment] {
        #if DEBUG
        if isDemoMode { return demoTranscription.segments }
        #endif
        return liveSegments
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
            .accessibilityLabel("Select client")

            Spacer()

            if recorder.isRecording {
                HStack(spacing: 6) {
                    Circle().fill(Color.red).frame(width: 7, height: 7)
                    Text(timeString(recorder.duration))
                        .font(.system(size: 14, weight: .bold).monospacedDigit())
                        .foregroundColor(.white)
                    if backgroundRecording {
                        Image(systemName: "lock.open.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.palmPrimaryLight)
                    }
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
                .contentShape(Rectangle())
                .onTapGesture { handleRecordTap() }
                .accessibilityLabel(recorder.isRecording ? "Stop recording" : "Start recording")
                .accessibilityAddTraits(.isButton)

            Text("Tap to start recording")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.palmPrimaryLight)
                .padding(.top, 16)

            Text("AI handles the rest")
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.4))
                .padding(.top, 4)

            Button { showFilePicker = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.up.doc.fill")
                        .font(.system(size: 13, weight: .semibold))
                    Text("Upload Audio File")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundColor(.palmPrimaryLight)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.06))
                .cornerRadius(20)
                .overlay(Capsule().stroke(Color.palmPrimary.opacity(0.3), lineWidth: 1))
            }
            .padding(.top, 20)

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
        GeometryReader { geo in
            VStack(spacing: 0) {
                VoiceOrb(isActive: true, audioLevel: {
                    #if DEBUG
                    if isDemoMode { return 0.4 }
                    #endif
                    return recorder.audioLevel
                }())
                    .frame(width: 120, height: 120)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        #if DEBUG
                        if isDemoMode {
                            demoTranscription.stopTranscribing()
                            isDemoMode = false
                            return
                        }
                        #endif
                        handleRecordTap()
                    }
                    .accessibilityLabel(recorder.isRecording ? "Stop recording" : "Start recording")
                    .accessibilityAddTraits(.isButton)
                    .frame(maxWidth: .infinity)
                    .frame(height: geo.size.height * 0.30)
                    .background(Color.clear)

                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.green.opacity(0.8))
                        .frame(width: 6, height: 6)
                    Text("LIVE TRANSCRIPT")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white.opacity(0.4))
                        .tracking(1.5)
                }
                .padding(.bottom, 8)

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
                        .padding(.top, 8)
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
        Task {
            if !permissionGranted {
                permissionGranted = await recorder.requestPermission()
            }
            guard permissionGranted else {
                await MainActor.run { showPermissionAlert = true }
                return
            }

            // Beta: no usage limits, so no pre-flight quota check.
            await MainActor.run {
                liveTranscription?.segments = []
                liveSegments = []
                liveFullTranscript = ""
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
    }

    private func stopAndProcess() {
        let url = recorder.stopRecording()
        liveTranscription?.stopTranscribing()
        liveTranscription?.segments = []

        guard let audioURL = url else {
            errorMessage = "Recording could not be saved. Please try again."
            showError = true
            return
        }

        // If the caregiver forgot to pick a client, don't discard the audio.
        // Hold it and prompt for a client; we'll process once one is chosen.
        guard let clientId = selectedClient?.id else {
            pendingAudioURL = audioURL
            showClientPicker = true
            return
        }

        processRecording(audioURL: audioURL, clientId: clientId, clientName: selectedClient?.full_name)
    }

    /// Upload a recorded audio file and run the assessment pipeline.
    /// Shared by the live-recording stop path and the deferred
    /// "picked a client after stopping" recovery path.
    private func processRecording(audioURL: URL, clientId: String, clientName: String?) {
        withAnimation {
            isProcessing = true
            uploadProgress = "Creating assessment..."
            pipelineSteps = []
        }

        Task {
            do {
                let visit = try await api.createVisit(clientId: clientId)
                let data = try Data(contentsOf: audioURL)

                await MainActor.run { uploadProgress = "Uploading audio..." }
                _ = try await api.uploadAudio(visitId: visit.id, audioData: data, filename: audioURL.lastPathComponent, autoProcess: true)
                try? FileManager.default.removeItem(at: audioURL)

                await MainActor.run { uploadProgress = "Pipeline running..." }
                await pollPipeline(visitId: visit.id, clientName: clientName)
            } catch {
                // Minimize PHI retention on device when upload/processing fails.
                try? FileManager.default.removeItem(at: audioURL)
                await MainActor.run {
                    withAnimation { isProcessing = false }
                    uploadProgress = nil
                    pipelineSteps = []
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }

    private func pollPipeline(visitId: String, clientName: String?) async {
        let stepOrder = ["transcription", "diarization", "billing", "note", "contract"]
        let stepLabels = [
            "transcription": "Transcription",
            "diarization": "Speaker ID",
            "billing": "Billables",
            "note": "Clinical Note",
            "contract": "Contract"
        ]

        var attempts = 0
        let maxAttempts = 120 // ~4 minutes max
        var consecutiveErrors = 0
        let maxConsecutiveErrors = 5 // ~10s of failed fetches before warning user

        while attempts < maxAttempts {
            attempts += 1
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds

            do {
                let status = try await api.getPipelineStatus(visitId: visitId)
                consecutiveErrors = 0
                guard let pipelineState = status.pipeline_state else { continue }

                var steps: [(String, String)] = []
                var allDone = true
                var anyFailed = false

                for key in stepOrder {
                    if let stateVal = pipelineState[key]?.value {
                        var stateStr = "pending"
                        if let dict = stateVal as? [String: Any], let s = dict["status"] as? String {
                            stateStr = s
                        } else if let s = stateVal as? String {
                            stateStr = s
                        }
                        let label = stepLabels[key] ?? key.capitalized
                        if stateStr == "skipped" { continue }
                        steps.append((label, stateStr))
                        if stateStr != "completed" && stateStr != "skipped" { allDone = false }
                        if stateStr == "failed" { anyFailed = true }
                    }
                }

                await MainActor.run {
                    pipelineSteps = steps
                    if let currentStep = steps.first(where: { isActiveStatus($0.1) }) {
                        uploadProgress = "Running: \(currentStep.0)..."
                    }
                }

                if allDone || anyFailed {
                    await MainActor.run {
                        completedVisitId = visitId
                        completedClientName = clientName
                        pipelineFailed = anyFailed && !allDone
                        withAnimation {
                            isProcessing = false
                            uploadProgress = nil
                            pipelineSteps = []
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            navigateToVisit = true
                        }
                    }
                    return
                }
            } catch {
                consecutiveErrors += 1
                if consecutiveErrors >= maxConsecutiveErrors {
                    await MainActor.run {
                        uploadProgress = "Connection lost — your assessment is still processing in the background."
                    }
                }
            }
        }

        // Timed out - still navigate to the visit
        await MainActor.run {
            completedVisitId = visitId
            completedClientName = clientName
            pipelineFailed = false
            withAnimation {
                isProcessing = false
                uploadProgress = nil
                pipelineSteps = []
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                navigateToVisit = true
            }
        }
    }

    private func handlePickedAudioFile(_ url: URL) {
        guard let clientId = selectedClient?.id else {
            errorMessage = "Please select a client first."
            showError = true
            return
        }

        let clientName = selectedClient?.full_name

        withAnimation {
            isProcessing = true
            uploadProgress = "Uploading audio file..."
            pipelineSteps = []
        }

        Task {
            do {
                let accessing = url.startAccessingSecurityScopedResource()
                defer { if accessing { url.stopAccessingSecurityScopedResource() } }

                let data = try Data(contentsOf: url)
                let filename = url.lastPathComponent

                await MainActor.run { uploadProgress = "Creating assessment..." }
                let visit = try await api.createVisit(clientId: clientId)

                await MainActor.run { uploadProgress = "Uploading audio..." }
                _ = try await api.uploadAudio(visitId: visit.id, audioData: data, filename: filename, autoProcess: true)

                await MainActor.run { uploadProgress = "Pipeline running..." }
                await pollPipeline(visitId: visit.id, clientName: clientName)
            } catch {
                await MainActor.run {
                    withAnimation { isProcessing = false }
                    uploadProgress = nil
                    pipelineSteps = []
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }

    /// The backend pipeline reports an in-flight step as "processing"
    /// (and historically "running"); treat both as active.
    private func isActiveStatus(_ status: String) -> Bool {
        let s = status.lowercased()
        return s == "running" || s == "processing" || s == "queued"
    }

    @ViewBuilder
    private func pipelineIcon(for status: String) -> some View {
        switch status.lowercased() {
        case "completed":
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 12))
                .foregroundColor(.palmGreen)
        case "running", "processing":
            ProgressView()
                .scaleEffect(0.5)
                .tint(.palmPrimary)
        case "failed":
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 12))
                .foregroundColor(.red)
        case "queued", "pending":
            Image(systemName: "clock.fill")
                .font(.system(size: 12))
                .foregroundColor(.palmOrange)
        default:
            Image(systemName: "circle")
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.3))
        }
    }

    private func pipelineColor(for status: String) -> Color {
        switch status.lowercased() {
        case "completed": return .palmGreen
        case "running", "processing": return .palmPrimary
        case "failed": return .red
        case "queued", "pending": return .palmOrange
        default: return .white.opacity(0.4)
        }
    }

    private func loadClients() async {
        do {
            let fetched = try await api.fetchClients()
            await MainActor.run { clients = fetched }
        } catch {
            await MainActor.run {
                errorMessage = "Could not load clients. Pull down to retry."
                showError = true
            }
        }
    }

    private func timeString(_ interval: TimeInterval) -> String {
        let m = Int(interval) / 60
        let s = Int(interval) % 60
        return String(format: "%02d:%02d", m, s)
    }
}
