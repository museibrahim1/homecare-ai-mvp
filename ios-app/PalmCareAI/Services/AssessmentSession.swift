import Foundation
import SwiftUI
import Combine

/// Owns the full lifecycle of a recorded assessment — recorder, live
/// transcription, audio upload, and pipeline polling — independent of any
/// view. RecordView only renders this state.
///
/// This object lives at the app level, so:
///  * switching tabs or navigating away never stops an active recording,
///  * an in-flight upload/pipeline keeps running and the contract still
///    opens when the user comes back,
///  * background recording keeps working because the recorder is never
///    deallocated by view teardown.
@MainActor
final class AssessmentSession: ObservableObject {
    let recorder = AudioRecorderService()
    let liveTranscription: LiveTranscriptionService

    // MARK: Processing state

    @Published var isProcessing = false
    @Published var uploadProgress: String?
    @Published var pipelineSteps: [(String, String)] = []
    @Published var pipelineFailed = false
    /// Set when the pipeline reaches a terminal state. RecordView observes
    /// this and navigates to the visit, then calls `acknowledgeCompletion()`.
    @Published var completedVisitId: String?
    @Published var completedClientName: String?
    /// Errors surfaced from recording/upload/pipeline, shown by RecordView.
    @Published var errorMessage: String?
    /// A finished recording waiting for a client to be chosen.
    @Published var pendingAudioURL: URL?
    /// Client chosen when recording started. Survives view teardown so the
    /// user is never re-asked for the client at stop time.
    @Published var activeClient: Client?

    private let api: APIService
    private var processingTask: Task<Void, Never>?
    private var cancellables: Set<AnyCancellable> = []

    init(api: APIService) {
        self.api = api
        self.liveTranscription = LiveTranscriptionService(api: api)

        // Republish nested-object changes so any view observing the session
        // re-renders when the recorder or live transcript updates.
        recorder.objectWillChange
            .sink { [weak self] _ in self?.objectWillChange.send() }
            .store(in: &cancellables)
        liveTranscription.objectWillChange
            .sink { [weak self] _ in self?.objectWillChange.send() }
            .store(in: &cancellables)
    }

    /// Mirrors the old @AppStorage("assessmentInProgress") flag used by the
    /// app-level session-timeout policy.
    private func setAssessmentInProgress(_ value: Bool) {
        UserDefaults.standard.set(value, forKey: "assessmentInProgress")
    }

    // MARK: - Recording

    func startRecording(client: Client?) throws {
        liveTranscription.segments = []
        try recorder.startRecording()
        activeClient = client
        PostHogService.shared.capture("assessment_recording_started", properties: [
            "has_client": client != nil,
        ])
        if let url = recorder.recordingURL {
            liveTranscription.startTranscribing(recordingURL: url)
        }
        setAssessmentInProgress(true)
    }

    /// Stop recording. With a client set, processing starts immediately;
    /// otherwise the audio is held in `pendingAudioURL` until one is chosen.
    func stopRecording(client explicitClient: Client?) {
        let client = explicitClient ?? activeClient
        let durationSeconds = Int(recorder.duration.rounded())
        activeClient = nil
        let url = recorder.stopRecording()
        PostHogService.shared.capture("assessment_recording_stopped", properties: [
            "has_client": client != nil,
            "duration_seconds": durationSeconds,
        ])
        liveTranscription.stopTranscribing()
        liveTranscription.segments = []

        guard let audioURL = url else {
            errorMessage = "Recording could not be saved. Please try again."
            setAssessmentInProgress(false)
            return
        }
        if let client {
            process(audioURL: audioURL, clientId: client.id, clientName: client.full_name)
        } else {
            pendingAudioURL = audioURL
        }
    }

    /// Recover from a system-killed recording (media daemon crash etc.).
    func recoverFailedRecording(client explicitClient: Client?) {
        let client = explicitClient ?? activeClient
        activeClient = nil
        liveTranscription.stopTranscribing()
        guard let url = recorder.recordingURL else { return }
        if let client {
            process(audioURL: url, clientId: client.id, clientName: client.full_name)
        } else {
            pendingAudioURL = url
        }
    }

    func processPendingAudio(client: Client) {
        guard let url = pendingAudioURL else { return }
        pendingAudioURL = nil
        process(audioURL: url, clientId: client.id, clientName: client.full_name)
    }

    func discardPendingAudio() {
        if let url = pendingAudioURL {
            try? FileManager.default.removeItem(at: url)
        }
        pendingAudioURL = nil
        setAssessmentInProgress(false)
    }

    /// Called by RecordView after it navigates to the finished visit.
    func acknowledgeCompletion() {
        completedVisitId = nil
        completedClientName = nil
        pipelineFailed = false
    }

    // MARK: - Upload + pipeline

    func process(audioURL: URL, clientId: String, clientName: String?) {
        PostHogService.shared.capture("assessment_process_started", properties: [
            "source": "recording",
        ])
        withAnimation {
            isProcessing = true
            uploadProgress = "Creating assessment..."
            pipelineSteps = []
        }
        setAssessmentInProgress(true)

        processingTask = Task {
            do {
                let visit = try await api.createVisit(clientId: clientId)
                PostHogService.shared.capture("assessment_visit_created")
                let data = try Data(contentsOf: audioURL)

                uploadProgress = "Uploading audio..."
                _ = try await api.uploadAudio(visitId: visit.id, audioData: data, filename: audioURL.lastPathComponent, autoProcess: true)
                PostHogService.shared.capture("assessment_upload_succeeded", properties: [
                    "source": "recording",
                ])
                try? FileManager.default.removeItem(at: audioURL)

                uploadProgress = "Pipeline running..."
                await pollPipeline(visitId: visit.id, clientName: clientName)
            } catch {
                PostHogService.shared.capture("assessment_upload_failed", properties: [
                    "source": "recording",
                ])
                // Minimize PHI retention on device when upload/processing fails.
                try? FileManager.default.removeItem(at: audioURL)
                withAnimation { isProcessing = false }
                uploadProgress = nil
                pipelineSteps = []
                errorMessage = error.palmFriendlyMessage
                setAssessmentInProgress(false)
            }
        }
    }

    /// Upload an audio file picked from Files (security-scoped URL).
    func processPickedFile(url: URL, clientId: String, clientName: String?) {
        PostHogService.shared.capture("assessment_process_started", properties: [
            "source": "file_upload",
        ])
        withAnimation {
            isProcessing = true
            uploadProgress = "Uploading audio file..."
            pipelineSteps = []
        }
        setAssessmentInProgress(true)

        processingTask = Task {
            do {
                let accessing = url.startAccessingSecurityScopedResource()
                defer { if accessing { url.stopAccessingSecurityScopedResource() } }

                let data = try Data(contentsOf: url)
                let filename = url.lastPathComponent

                uploadProgress = "Creating assessment..."
                let visit = try await api.createVisit(clientId: clientId)
                PostHogService.shared.capture("assessment_visit_created")

                uploadProgress = "Uploading audio..."
                _ = try await api.uploadAudio(visitId: visit.id, audioData: data, filename: filename, autoProcess: true)
                PostHogService.shared.capture("assessment_upload_succeeded", properties: [
                    "source": "file_upload",
                ])

                uploadProgress = "Pipeline running..."
                await pollPipeline(visitId: visit.id, clientName: clientName)
            } catch {
                PostHogService.shared.capture("assessment_upload_failed", properties: [
                    "source": "file_upload",
                ])
                withAnimation { isProcessing = false }
                uploadProgress = nil
                pipelineSteps = []
                errorMessage = error.palmFriendlyMessage
                setAssessmentInProgress(false)
            }
        }
    }

    /// The backend pipeline reports an in-flight step as "processing"
    /// (and historically "running"); treat both as active.
    static func isActiveStatus(_ status: String) -> Bool {
        let s = status.lowercased()
        return s == "running" || s == "processing" || s == "queued"
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
            if Task.isCancelled { return }
            attempts += 1
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            if Task.isCancelled { return }

            do {
                let status = try await api.getPipelineStatus(visitId: visitId)
                consecutiveErrors = 0

                // The visit status itself going terminal beats waiting for
                // every step: when a step fails, downstream steps stay
                // "pending" forever and the user would otherwise sit at the
                // processing screen until the 4-minute timeout.
                let visitStatus = status.status?.lowercased() ?? ""
                if visitStatus == "pipeline_failed" || visitStatus == "pending_review" {
                    finishProcessing(
                        visitId: visitId,
                        clientName: clientName,
                        failed: visitStatus == "pipeline_failed",
                        result: visitStatus
                    )
                    return
                }

                guard let pipelineState = status.pipeline_state else { continue }

                var steps: [(String, String)] = []
                var allTerminal = true
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
                        // Wait until every step reaches a terminal state —
                        // navigating away on the first failure would hide
                        // steps that are still producing results.
                        if stateStr != "completed" && stateStr != "failed" { allTerminal = false }
                        if stateStr == "failed" { anyFailed = true }
                    }
                }

                pipelineSteps = steps
                if let currentStep = steps.first(where: { Self.isActiveStatus($0.1) }) {
                    uploadProgress = "Running: \(currentStep.0)..."
                }

                if allTerminal && !steps.isEmpty {
                    finishProcessing(
                        visitId: visitId,
                        clientName: clientName,
                        failed: anyFailed,
                        result: anyFailed ? "step_failed" : "completed"
                    )
                    return
                }
            } catch {
                consecutiveErrors += 1
                if consecutiveErrors >= maxConsecutiveErrors {
                    uploadProgress = "Connection lost — your assessment is still processing in the background."
                }
            }
        }

        // Timed out — still surface the visit, but flag it so RecordView
        // lands on Overview: the pipeline may not have a contract yet.
        finishProcessing(visitId: visitId, clientName: clientName, failed: true, result: "timeout")
    }

    private func finishProcessing(visitId: String, clientName: String?, failed: Bool, result: String) {
        pipelineFailed = failed
        completedClientName = clientName
        PostHogService.shared.capture("assessment_pipeline_finished", properties: [
            "result": result,
            "failed": failed,
        ])
        withAnimation {
            isProcessing = false
            uploadProgress = nil
            pipelineSteps = []
        }
        setAssessmentInProgress(false)
        // Set last: RecordView's onReceive uses this as the navigation signal,
        // so all other state must already be in place.
        completedVisitId = visitId
    }
}
