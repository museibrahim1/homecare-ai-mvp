import SwiftUI
import AVFoundation
import UniformTypeIdentifiers

struct RecordView: View {
    @EnvironmentObject var api: APIService
    /// App-level session owning the recorder and the upload/pipeline task.
    /// Lives outside this view, so leaving the screen never stops a recording
    /// or kills contract processing.
    @EnvironmentObject var session: AssessmentSession
    @State private var liveSegments: [TranscriptSegment] = []
    @State private var liveFullTranscript = ""
    @State private var liveNoSpeech = false
    @State private var liveError: String?
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
    @State private var showFilePicker = false
    @AppStorage("backgroundRecording") private var backgroundRecording = false
    /// One-time, explicit consent to send visit audio/transcripts to our
    /// third-party AI processors (Deepgram, Anthropic). Required by App Store
    /// Review guideline 5.1.1(i)/5.1.2(i): the user must be told what data is
    /// sent, to whom, and grant permission *before* any data leaves the device.
    @AppStorage("aiProcessingConsentAccepted") private var aiConsentAccepted = false
    @State private var showAIConsent = false
    /// Action to run once the user accepts the AI data-sharing consent.
    @State private var pendingConsentAction: (() -> Void)?

    /// Local copies of the finished visit used by navigationDestination —
    /// the session's values are cleared on acknowledgeCompletion().
    @State private var completedVisitId: String?
    @State private var pipelineFailed = false
    @State private var completedClientName: String?
    @State private var navigateToVisit = false
    /// True when the user tapped record with no client selected — the picker
    /// opens first and recording auto-starts once they choose someone.
    @State private var pendingStartAfterClientPick = false
    /// Shown when the picker is dismissed while a finished recording is on
    /// hold, so the audio is never silently discarded.
    @State private var showHeldRecordingPrompt = false
    @State private var showAudioSavedPrompt = false
    @State private var audioSavedMessage = "We still have your audio on this iPhone. Retry when you have a signal."
    @State private var showAssessmentPaywall = false
    #if DEBUG
    @State private var didRunAutomationDemo = false
    #endif

    private var recorder: AudioRecorderService { session.recorder }
    private var isProcessing: Bool { session.isProcessing }
    private var uploadProgress: String? { session.uploadProgress }
    private var pipelineSteps: [(String, String)] { session.pipelineSteps }

    var body: some View {
            ZStack {
                // Pipeline Glass: mint wash for Palm It, Recording, and Processing.
                PalmGlassBackground()
                    .ignoresSafeArea()

                if isProcessing {
                    processingScreen
                        .transition(.opacity)
                } else {
                    VStack(spacing: 0) {
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
                }

                // Phone call / Siri interruption banner — recording is paused
                // by the system and will resume automatically when it ends.
                if recorder.isRecording && recorder.isInterrupted {
                    VStack {
                        HStack(spacing: 10) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.palmOrange)
                            Text("Recording paused by a call. It will resume automatically.")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .palmGlassCard(radius: 14)
                        .padding(.horizontal, 20)
                        .padding(.top, 70)
                        Spacer()
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }

                // Offline / failed upload queue — audio is still on device.
                if !isProcessing && !session.pendingUploads.isEmpty {
                    VStack {
                        pendingUploadBanner
                            .padding(.horizontal, 20)
                            .padding(.top, 70)
                        Spacer()
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }

            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationBarBackButtonHidden(true)
            .navigationDestination(isPresented: $navigateToVisit) {
                if let visitId = completedVisitId, !visitId.isEmpty {
                    VisitDetailView(
                        visitId: visitId,
                        clientName: completedClientName,
                        initialTab: pipelineFailed ? 0 : 5
                    )
                    .environmentObject(api)
                }
            }
            .sheet(isPresented: $showClientPicker) {
                ClientPickerSheet(clients: clients, selected: $selectedClient, onClientAdded: { newClient in
                    clients.insert(newClient, at: 0)
                })
                .environmentObject(api)
            }
            .sheet(isPresented: $showAssessmentPaywall, onDismiss: {
                // If they subscribed, start recording on the next tap.
            }) {
                PaywallView(isRequired: true, allowsNotNow: true)
                    .environmentObject(api)
            }
            .palmConfirmAlert(
                "Microphone Access",
                message: "PALM needs microphone access to record visits. Please enable it in Settings.",
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
            .sheet(isPresented: $showAIConsent) {
                AIDataConsentSheet(
                    onAgree: {
                        aiConsentAccepted = true
                        showAIConsent = false
                        let action = pendingConsentAction
                        pendingConsentAction = nil
                        // Let the consent sheet finish dismissing before any
                        // follow-up sheet (e.g. the client picker) presents.
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                            action?()
                        }
                    },
                    onCancel: {
                        showAIConsent = false
                        pendingConsentAction = nil
                    }
                )
            }
            .task {
                // Do not prompt on appear — Paper Palm It is a clean Ready screen.
                // Ask for the mic only when the user starts a recording.
                permissionGranted = recorder.checkPermissionStatus()
                await loadClients()
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("LIVE_TRANSCRIPT_SMOKE"),
                   !ProcessInfo.processInfo.arguments.contains("MARKETING_FULL_PIPELINE"),
                   !didRunAutomationDemo {
                    didRunAutomationDemo = true
                    aiConsentAccepted = true
                    if selectedClient == nil {
                        selectedClient = clients.first
                    }
                    startRecording()
                }
                #endif
            }
            #if DEBUG
            .task {
                guard ProcessInfo.processInfo.arguments.contains("MARKETING_FULL_PIPELINE") else { return }
                guard !didRunAutomationDemo else { return }
                didRunAutomationDemo = true
                aiConsentAccepted = true
                // Let login + clients load settle so the Record screen is visible.
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                if clients.isEmpty {
                    await loadClients()
                }
                await MainActor.run {
                    selectedClient = clients.first(where: {
                        $0.full_name.localizedCaseInsensitiveContains("Eleanor")
                    }) ?? clients.first
                }
                // Hold on the ready screen briefly so the recording CTA is clear.
                try? await Task.sleep(nanoseconds: 2_500_000_000)
                await MainActor.run { startRecording() }
                // Record long enough for live transcript + marketing beat.
                try? await Task.sleep(nanoseconds: 40_000_000_000)
                await MainActor.run {
                    if recorder.isRecording {
                        stopAndProcess()
                    }
                }
            }
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
                // If a recording is in flight from a previous visit to this
                // tab, restore the client chosen at start.
                if selectedClient == nil, let active = session.activeClient {
                    selectedClient = active
                }
                let lt = session.liveTranscription
                if lt.isTranscribing {
                    liveSegments = lt.segments
                    liveFullTranscript = lt.fullTranscript
                    liveNoSpeech = lt.noSpeechDetected
                    liveError = lt.lastError
                }
            }
            .onReceive(session.liveTranscription.$fullTranscript) { liveFullTranscript = $0 }
            .onReceive(session.liveTranscription.$segments) { liveSegments = $0 }
            .onReceive(session.liveTranscription.$noSpeechDetected) { liveNoSpeech = $0 }
            .onReceive(session.liveTranscription.$lastError) { liveError = $0 }
            .onReceive(session.$completedVisitId) { visitId in
                guard let visitId else { return }
                openCompletedVisit(visitId)
            }
            .onReceive(session.$errorMessage) { message in
                guard let message else { return }
                session.errorMessage = nil
                errorMessage = message
                showError = true
            }
            .onReceive(session.$audioSavedNotice) { notice in
                guard let notice else { return }
                audioSavedMessage = notice
                showAudioSavedPrompt = true
            }
            .onAppear {
                session.resumePendingUploadsIfNeeded()
            }
            .onChange(of: selectedClient?.id) { clientId in
                guard clientId != nil, let client = selectedClient else { return }
                // A recording was held because no client was selected at stop.
                // Now that one is chosen, process it.
                if session.pendingAudioURL != nil {
                    showHeldRecordingPrompt = false
                    session.processPendingAudio(client: client)
                    return
                }
                // The user tapped record before picking a client — start now.
                if pendingStartAfterClientPick {
                    pendingStartAfterClientPick = false
                    startRecording()
                }
            }
            .onChange(of: showClientPicker) { isShowing in
                if isShowing {
                    // Retry a failed initial load so the picker isn't empty.
                    if clients.isEmpty {
                        Task { await loadClients(quiet: true) }
                    }
                    return
                }
                if selectedClient == nil {
                    pendingStartAfterClientPick = false
                    // Picker dismissed while a finished recording is on hold —
                    // ask before doing anything destructive with the audio.
                    if session.pendingAudioURL != nil {
                        showHeldRecordingPrompt = true
                    }
                }
            }
            .palmAlert(
                "Recording On Hold",
                message: "Your recording is saved but needs a client before it can be processed into a contract.",
                icon: "person.crop.circle.badge.questionmark",
                iconColor: .palmOrange,
                isPresented: $showHeldRecordingPrompt,
                primaryButton: .init(title: "Choose Client", style: .primary, action: {
                    showClientPicker = true
                }),
                secondaryButton: .init(title: "Discard Recording", style: .destructive, action: {
                    session.discardPendingAudio()
                })
            )
            .palmAlert(
                "Audio Saved on This iPhone",
                message: audioSavedMessage,
                icon: "internaldrive.fill",
                iconColor: .palmPrimary,
                isPresented: $showAudioSavedPrompt,
                primaryButton: .init(title: "Retry Upload", style: .primary, action: {
                    session.acknowledgeAudioSavedNotice()
                    session.resumePendingUploadsIfNeeded()
                }),
                secondaryButton: .init(title: "Keep for Later", style: .cancel, action: {
                    session.acknowledgeAudioSavedNotice()
                })
            )
            .onChange(of: recorder.recordingFailureMessage) { message in
                // System killed the recording (media daemon crash). Recover
                // the partial file through the normal upload path.
                guard let message else { return }
                recorder.recordingFailureMessage = nil
                session.recoverFailedRecording(client: selectedClient)
                if selectedClient == nil, session.pendingAudioURL != nil {
                    showClientPicker = true
                }
                errorMessage = message
                showError = true
            }
    }

    /// Copy the finished visit out of the session and push the detail view.
    private func openCompletedVisit(_ visitId: String) {
        completedVisitId = visitId
        completedClientName = session.completedClientName
        pipelineFailed = session.pipelineFailed
        session.acknowledgeCompletion()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            navigateToVisit = true
        }
    }

    // MARK: - Top Bar

    private var pendingUploadBanner: some View {
        let count = session.pendingUploads.count
        let name = session.pendingUploads.first?.clientName
        let subtitle: String = {
            if let name, count == 1 {
                return "\(name)'s visit audio is saved locally."
            }
            if count == 1 {
                return "Your visit audio is saved locally."
            }
            return "\(count) visit recordings are saved locally."
        }()

        return HStack(alignment: .top, spacing: 12) {
            Image(systemName: "internaldrive.fill")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.palmPrimaryLight)
                .padding(.top, 2)

            VStack(alignment: .leading, spacing: 4) {
                Text("We still have your audio")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmText)
                Text(subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.palmSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                if let err = session.pendingUploads.first?.lastError, !err.isEmpty {
                    Text(err)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.palmOrange)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            Spacer(minLength: 8)

            Button {
                session.resumePendingUploadsIfNeeded()
            } label: {
                Text("Retry")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.palmPrimary)
                    .clipShape(Capsule())
            }
            .accessibilityLabel("Retry saved upload")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .palmGlassCard(radius: 14)
    }

    /// Paper Palm It: Select Client + Upload sit under the title, not above it.
    private var idleActionPills: some View {
        let chipFill = Color.white.opacity(0.58)
        let chipStroke = Color.white.opacity(0.88)
        let ink = Color(red: 17 / 255, green: 24 / 255, blue: 39 / 255) // #111827

        return HStack(spacing: 8) {
            Button { showClientPicker = true } label: {
                Text(selectedClient?.full_name ?? "Select Client")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(ink)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(chipFill)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(chipStroke, lineWidth: 1))
            }
            .accessibilityLabel("Select client")

            Button { showFilePicker = true } label: {
                Text("Upload")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(ink)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(chipFill)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(chipStroke, lineWidth: 1))
            }
            .accessibilityLabel("Upload audio file")
        }
    }

    /// Compact client + timer chrome while recording (kept for DEBUG demos /
    /// future Recording variants; Paper Recording uses Live/Recording header).
    private var recordingTopBar: some View {
        HStack(alignment: .center, spacing: 12) {
            Button { showClientPicker = true } label: {
                HStack(spacing: 7) {
                    Image(systemName: "person")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(selectedClient != nil ? .palmPrimary : Color(red: 75 / 255, green: 107 / 255, blue: 102 / 255))
                    Text(selectedClient?.full_name ?? "Select Client")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255))
                        .lineLimit(1)
                        .truncationMode(.tail)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(Color(red: 75 / 255, green: 107 / 255, blue: 102 / 255).opacity(0.7))
                }
                .padding(.horizontal, 14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(height: 36)
                .background(Color.white.opacity(0.58))
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Color.white.opacity(0.88), lineWidth: 1))
            }
            .accessibilityLabel("Select client")

            HStack(spacing: 6) {
                Circle().fill(Color.red).frame(width: 6, height: 6)
                Text(timeString(recorder.duration))
                    .font(.system(size: 13, weight: .semibold).monospacedDigit())
                    .foregroundColor(Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255))
            }
            .padding(.horizontal, 14)
            .frame(height: 36)
            .background(Color.white.opacity(0.58))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.red.opacity(0.28), lineWidth: 1))
            .fixedSize()
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 6)
    }

    private var transcriptSegments: [TranscriptSegment] {
        #if DEBUG
        if isDemoMode { return demoTranscription.segments }
        #endif
        return liveSegments
    }

    /// Consecutive turns with the same remapped speaker become one paragraph.
    /// Speaker IDs are already stabilized across chunks in LiveTranscriptMerger.
    private var transcriptBlocks: [(id: UUID, speaker: Int, text: String)] {
        var blocks: [(id: UUID, speaker: Int, text: String)] = []
        for seg in transcriptSegments {
            let text = seg.text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { continue }
            if let last = blocks.last, last.speaker == seg.speaker {
                blocks[blocks.count - 1].text += " " + text
            } else {
                blocks.append((seg.id, seg.speaker, text))
            }
        }
        return blocks
    }

    private var hasMultipleSpeakers: Bool {
        Set(transcriptBlocks.map(\.speaker)).count > 1
    }

    // MARK: - Orb stage (idle + recording)

    /// Trailing glass "+" button matching HomeView — opens the client picker
    /// (which can also add a new client) from any Record header.
    private var headerAddButton: some View {
        Button { showClientPicker = true } label: {
            Image(systemName: "plus")
                .font(.system(size: 20, weight: .regular))
                .foregroundColor(Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255))
                .frame(width: 44, height: 44)
                .background(
                    Circle()
                        .fill(Color.white.opacity(0.62))
                        .overlay(Circle().stroke(Color.white.opacity(0.90), lineWidth: 1))
                )
                .shadow(color: PalmGlass.shadow, radius: 10, y: 4)
        }
        .accessibilityLabel("Select or add client")
    }

    private var idleLayout: some View {
        let ink = Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255) // #10211F
        let muted = Color(red: 75 / 255, green: 107 / 255, blue: 102 / 255) // #4B6B66

        return VStack(spacing: 0) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Ready")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(muted)
                    Text("Palm It")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundColor(ink)
                        .tracking(-1.4)
                }
                Spacer(minLength: 12)
                headerAddButton
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 8)
            .padding(.bottom, 18)

            VStack(spacing: 16) {
                idleActionPills
                orbStage(isActive: false, audioLevel: 0, caption: "Tap to start recording", size: 220)
            }
            .padding(.horizontal, 24)

            Spacer(minLength: 40)
        }
    }

    /// Paper Pipeline Glass → Processing. Full-screen process card over mint wash.
    private var processingScreen: some View {
        let ink = Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255)
        let muted = Color(red: 75 / 255, green: 107 / 255, blue: 102 / 255)

        return VStack(spacing: 0) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(processingClientFirstName.isEmpty ? "Client" : processingClientFirstName)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(muted)
                        .lineLimit(1)
                    Text("Processing")
                        .font(.system(size: 34, weight: .bold))
                        .tracking(-1.4)
                        .foregroundColor(ink)
                }
                Spacer(minLength: 12)
                headerAddButton
            }
            .padding(.horizontal, 24)
            .padding(.top, 8)
            .padding(.bottom, 18)

            PalmPipelineProcessingCard(
                readyCount: processingReadyCount,
                totalCount: max(processingDocSteps.count, 1),
                clientFirstName: processingClientFirstName,
                subtitle: processingSubtitle,
                steps: processingDocSteps
            )
            .padding(.horizontal, 24)
            .padding(.bottom, 110)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private var processingClientFirstName: String {
        let full = selectedClient?.full_name ?? ""
        return full.split(separator: " ").first.map(String.init) ?? full
    }

    private var processingSubtitle: String {
        // Name the client's state when we know it, matching the Paper Processing
        // hero line. Step-level status still shows in the checklist rows below.
        if let code = selectedClient?.state?.trimmingCharacters(in: .whitespaces), !code.isEmpty {
            let name = code.count == 2
                ? (VisitDetailView.usStateNames[code.uppercased()] ?? code.uppercased())
                : code
            return "Care plan, billables, notes, and the \(name) contract."
        }
        return "Care plan, billables, notes, and the contract."
    }

    private var processingReadyCount: Int {
        processingDocSteps.filter { $0.status == .ready }.count
    }

    /// Map live pipeline rows into the four Paper Processing docs.
    /// Care plan is written with the contract server-side, so fall back to the
    /// contract step when no standalone care-plan row exists (same as VisitDetail).
    private var processingDocSteps: [PalmPipelineProcessingCard.Step] {
        let aliases: [(String, [String])] = [
            ("Care plan", ["care plan", "care_plan"]),
            ("Billables", ["billable", "billing"]),
            ("Notes", ["note", "clinical"]),
            ("Contract", ["contract"]),
        ]
        var mapped: [PalmPipelineProcessingCard.Step] = []
        for (title, keys) in aliases {
            var match = pipelineSteps.first { step, _ in
                let lower = step.lowercased()
                return keys.contains { lower.contains($0) }
            }
            if title == "Care plan", match == nil {
                match = pipelineSteps.first { step, _ in
                    step.lowercased().contains("contract")
                }
            }
            let status = palmProcessingStatus(match?.1)
            mapped.append(.init(id: title, title: title, status: status))
        }
        if pipelineSteps.isEmpty {
            return [
                .init(id: "Care plan", title: "Care plan", status: .writing),
                .init(id: "Billables", title: "Billables", status: .next),
                .init(id: "Notes", title: "Notes", status: .next),
                .init(id: "Contract", title: "Contract", status: .next),
            ]
        }
        return mapped
    }

    private func palmProcessingStatus(_ raw: String?) -> PalmPipelineProcessingCard.Step.Status {
        switch (raw ?? "").lowercased() {
        case "completed": return .ready
        case "running", "processing": return .writing
        case "failed": return .failed
        case "queued", "pending": return .next
        default: return .next
        }
    }

    private var recordingLayout: some View {
        let ink = Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255)
        let muted = Color(red: 75 / 255, green: 107 / 255, blue: 102 / 255)
        let hasTranscript = !transcriptBlocks.isEmpty || !liveFullTranscript.isEmpty

        return VStack(spacing: 0) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Live")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(muted)
                    Text("Recording")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundColor(ink)
                        .tracking(-1.4)
                }
                Spacer(minLength: 12)
                headerAddButton
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)
            .padding(.top, 8)
            .padding(.bottom, 18)

            // Paper Recording artboard: large orb + "Tap to stop".
            // Live transcript stays below when speech arrives (product need).
            orbStage(
                isActive: true,
                audioLevel: {
                    #if DEBUG
                    if isDemoMode { return 0.4 }
                    #endif
                    return recorder.audioLevel
                }(),
                caption: hasTranscript ? nil : "Tap to stop",
                size: 220
            )
            .padding(.horizontal, 24)

            if hasTranscript || liveNoSpeech || (liveError != nil && !(liveError ?? "").isEmpty) {
                transcriptStream
                    .padding(.top, 12)
            } else {
                Spacer(minLength: 40)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private var transcriptStream: some View {
        Group {
            if let err = liveError, !err.isEmpty, transcriptBlocks.isEmpty {
                Text(err)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.palmOrange)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
            } else if transcriptBlocks.isEmpty, liveNoSpeech {
                Text("No speech detected yet. Speak near the microphone.")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.palmSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 28)
            } else if transcriptBlocks.isEmpty, !liveFullTranscript.isEmpty {
                ScrollView(showsIndicators: false) {
                    WrappingHStack(words: liveFullTranscript.split(separator: " ").map(String.init))
                        .padding(.horizontal, 24)
                        .padding(.bottom, 28)
                }
            } else if transcriptBlocks.isEmpty {
                Text("Listening…")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.palmSecondary)
            } else {
                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: hasMultipleSpeakers ? 18 : 0) {
                            ForEach(transcriptBlocks, id: \.id) { block in
                                VStack(alignment: .leading, spacing: 6) {
                                    if hasMultipleSpeakers {
                                        Text(block.speaker == 0 ? "Speaker 1" : "Speaker \(block.speaker + 1)")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(speakerColor(for: block.speaker).opacity(0.85))
                                    }
                                    WrappingHStack(words: block.text.split(separator: " ").map(String.init))
                                }
                                .id(block.id)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 28)
                    }
                    .onChange(of: transcriptBlocks.last?.text) { _ in
                        if let last = transcriptBlocks.last {
                            withAnimation(.easeOut(duration: 0.25)) {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private func orbStage(isActive: Bool, audioLevel: Float, caption: String?, size: CGFloat) -> some View {
        VStack(spacing: 0) {
            if caption != nil { Spacer(minLength: 12) }

            VoiceOrb(isActive: isActive, audioLevel: audioLevel, size: size)
                .frame(width: size, height: size)
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
                .accessibilityLabel(isActive ? "Stop recording" : "Start recording")
                .accessibilityAddTraits(.isButton)

            if let caption {
                Text(caption)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.palmSecondary)
                    .padding(.top, 18)
                Spacer(minLength: 12)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Actions

    private func handleRecordTap() {
        if recorder.isRecording {
            stopAndProcess()
            return
        }
        // Don't allow a second recording while the previous assessment
        // is still uploading/processing — it would create overlapping
        // visits sharing the same UI state.
        guard !isProcessing else { return }
        // Gate the entire recording flow behind explicit AI data-sharing
        // consent: nothing is recorded or uploaded until the user agrees.
        requireAIConsent { beginRecordingFlow() }
    }

    private func beginRecordingFlow() {
        guard selectedClient != nil else {
            // Pick the client up front so stopping always leads straight
            // to processing — no held-audio limbo at the end of a visit.
            pendingStartAfterClientPick = true
            showClientPicker = true
            return
        }
        startRecording()
    }

    /// Runs `action` immediately if the user has already consented to AI
    /// processing; otherwise presents the consent sheet and defers it.
    private func requireAIConsent(_ action: @escaping () -> Void) {
        if aiConsentAccepted {
            action()
        } else {
            pendingConsentAction = action
            showAIConsent = true
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

            let email = await MainActor.run { api.cachedUserEmail }
            await StoreKitService.shared.syncEntitlements()
            await StoreKitService.shared.syncBackendAccess(using: api)
            if !StoreKitService.shared.hasPaidAccess(email: email) {
                // Soft browse is fine; recording requires a trial or plan.
                await MainActor.run { showAssessmentPaywall = true }
                return
            }

            // Usage limits are enforced server-side on submit, not here.
            await MainActor.run {
                liveSegments = []
                liveFullTranscript = ""
                liveNoSpeech = false
                liveError = nil
                do {
                    try session.startRecording(client: selectedClient)
                } catch {
                    errorMessage = "Failed to start recording: \(error.localizedDescription)"
                    showError = true
                }
            }
        }
    }

    private func stopAndProcess() {
        session.stopRecording(client: selectedClient)
        // If the caregiver somehow stopped without a client, the audio is
        // held by the session; prompt for a client to process it.
        if session.pendingAudioURL != nil {
            showClientPicker = true
        }
    }

    private func handlePickedAudioFile(_ url: URL) {
        Task {
            await StoreKitService.shared.syncEntitlements()
            await StoreKitService.shared.syncBackendAccess(using: api)
            guard StoreKitService.shared.hasPaidAccess(email: api.cachedUserEmail) else {
                await MainActor.run { showAssessmentPaywall = true }
                return
            }
            guard let client = selectedClient else {
                await MainActor.run {
                    errorMessage = "Please select a client first."
                    showError = true
                }
                return
            }
            await MainActor.run {
                requireAIConsent {
                    session.processPickedFile(url: url, clientId: client.id, clientName: client.full_name)
                }
            }
        }
    }

    private func loadClients(quiet: Bool = false) async {
        do {
            let fetched = try await api.fetchClients()
            await MainActor.run { clients = fetched }
        } catch {
            guard !quiet else { return }
            await MainActor.run {
                errorMessage = "Could not load clients. Check your connection and try again."
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

// MARK: - AI Data Sharing Consent

/// Explicit, in-app disclosure and consent shown before any visit audio or
/// transcript is sent to a third-party AI service. Satisfies App Store Review
/// guideline 5.1.1(i)/5.1.2(i): the user is told *what* is sent, *who* it goes
/// to, and must tap Agree *before* any data leaves the device.
struct AIDataConsentSheet: View {
    let onAgree: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 10) {
                        Image(systemName: "lock.shield.fill")
                            .font(.system(size: 34))
                            .foregroundColor(.palmPrimary)

                        Text("How your recordings are processed")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.palmText)

                        Text("Before you record or upload a visit, here’s exactly what happens to that audio and who processes it. Your permission is required to continue.")
                            .font(.system(size: 14))
                            .foregroundColor(.palmSecondary)
                            .lineSpacing(3)
                    }

                    consentRow(
                        icon: "waveform",
                        title: "What we send",
                        body: "The audio you record (or upload) and the transcript it produces. This may include personal and health information about your client."
                    )

                    consentRow(
                        icon: "text.bubble.fill",
                        title: "Deepgram — Transcription",
                        body: "Audio is sent to Deepgram to convert speech to text and identify speakers. Deepgram does not retain your audio after processing and does not use it to train its models."
                    )

                    consentRow(
                        icon: "doc.text.fill",
                        title: "Anthropic (Claude) — Documentation",
                        body: "The transcript is sent to Anthropic to generate visit notes, billable items, and the service agreement. Anthropic does not use your data to train its models."
                    )

                    consentRow(
                        icon: "checkmark.shield.fill",
                        title: "How it’s protected",
                        body: "Data is encrypted in transit (TLS) and at rest. These providers are bound by agreements requiring protections equal to our own. Your data is never sold or used for advertising."
                    )

                    VStack(alignment: .leading, spacing: 10) {
                        Link("Read our full Privacy Policy", destination: URL(string: "https://palmcareai.com/privacy")!)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmPrimary)

                        Text("You are responsible for obtaining any consent required from the individuals whose information you record.")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                            .lineSpacing(2)
                    }

                    VStack(spacing: 12) {
                        Button(action: onAgree) {
                            Text("Agree and Continue")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .background(
                                    LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                                                   startPoint: .leading, endPoint: .trailing)
                                )
                                .cornerRadius(12)
                        }

                        Button(action: onCancel) {
                            Text("Not Now")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.palmSecondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                        }
                    }
                    .padding(.top, 4)
                }
                .padding(.horizontal, 22)
                .padding(.top, 24)
                .padding(.bottom, 40)
            }
            .background(PalmGlassBackground())
            .navigationTitle("Data & Privacy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel", action: onCancel)
                }
            }
            .interactiveDismissDisabled(true)
        }
    }

    private func consentRow(icon: String, title: String, body: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(.palmPrimary)
                .frame(width: 26)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmText)
                Text(body)
                    .font(.system(size: 13))
                    .foregroundColor(.palmSecondary)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
