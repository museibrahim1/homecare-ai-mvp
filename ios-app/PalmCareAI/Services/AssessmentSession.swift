import Foundation
import SwiftUI
import Combine
import Network

/// Owns the full lifecycle of a recorded assessment — recorder, live
/// transcription, audio upload, and pipeline polling — independent of any
/// view. RecordView only renders this state.
///
/// This object lives at the app level, so:
///  * switching tabs or navigating away never stops an active recording,
///  * an in-flight upload/pipeline keeps running and the contract still
///    opens when the user comes back,
///  * background recording keeps working because the recorder is never
///    deallocated by view teardown,
///  * failed uploads keep the WAV on device and retry when signal returns.
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
    /// Shown when upload failed but audio is still on this iPhone.
    @Published var audioSavedNotice: String?
    /// A finished recording waiting for a client to be chosen.
    @Published var pendingAudioURL: URL?
    /// Client chosen when recording started. Survives view teardown so the
    /// user is never re-asked for the client at stop time.
    @Published var activeClient: Client?
    /// Failed uploads waiting for retry (mirrored from PendingUploadStore).
    @Published private(set) var pendingUploads: [PendingUpload] = []

    private let api: APIService
    private let uploadStore: PendingUploadStore
    private var processingTask: Task<Void, Never>?
    private var cancellables: Set<AnyCancellable> = []
    private let pathMonitor = NWPathMonitor()
    private let pathMonitorQueue = DispatchQueue(label: "com.palmcareai.pathMonitor")
    private var isPathSatisfied = true
    private var isDrainingQueue = false

    init(api: APIService, uploadStore: PendingUploadStore = .shared) {
        self.api = api
        self.uploadStore = uploadStore
        self.liveTranscription = LiveTranscriptionService(api: api)
        self.pendingUploads = uploadStore.items

        // Republish nested-object changes so any view observing the session
        // re-renders when the recorder or live transcript updates.
        recorder.objectWillChange
            .sink { [weak self] _ in self?.objectWillChange.send() }
            .store(in: &cancellables)
        liveTranscription.objectWillChange
            .sink { [weak self] _ in self?.objectWillChange.send() }
            .store(in: &cancellables)
        uploadStore.$items
            .receive(on: RunLoop.main)
            .sink { [weak self] items in
                self?.pendingUploads = items
            }
            .store(in: &cancellables)

        startPathMonitor()
    }

    deinit {
        pathMonitor.cancel()
    }

    /// Mirrors the old @AppStorage("assessmentInProgress") flag used by the
    /// app-level session-timeout policy.
    private func setAssessmentInProgress(_ value: Bool) {
        UserDefaults.standard.set(value, forKey: "assessmentInProgress")
    }

    private func startPathMonitor() {
        pathMonitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                guard let self else { return }
                let satisfied = path.status == .satisfied
                let becameOnline = satisfied && !self.isPathSatisfied
                self.isPathSatisfied = satisfied
                if becameOnline {
                    self.resumePendingUploadsIfNeeded()
                }
            }
        }
        pathMonitor.start(queue: pathMonitorQueue)
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

    func acknowledgeAudioSavedNotice() {
        audioSavedNotice = nil
    }

    // MARK: - Offline queue

    /// Retry every queued upload (manual or when network returns).
    func resumePendingUploadsIfNeeded() {
        guard !isProcessing, !isDrainingQueue, !pendingUploads.isEmpty else { return }
        guard isPathSatisfied else { return }
        isDrainingQueue = true
        Task {
            defer { isDrainingQueue = false }
            // Snapshot IDs so mutations during drain do not skip items.
            let ids = pendingUploads.map(\.id)
            for id in ids {
                guard !isProcessing else { return }
                await retryPendingUpload(id: id)
            }
        }
    }

    func retryPendingUpload(id: String) async {
        guard let item = uploadStore.item(id: id) else { return }
        guard let audioURL = item.resolvedAudioURL() else {
            uploadStore.remove(id: id)
            return
        }
        await processQueued(
            uploadId: item.id,
            audioURL: audioURL,
            clientId: item.clientId,
            clientName: item.clientName,
            existingVisitId: item.visitId
        )
    }

    func discardPendingUpload(id: String) {
        if let item = uploadStore.item(id: id), let url = item.resolvedAudioURL() {
            try? FileManager.default.removeItem(at: url)
        }
        uploadStore.remove(id: id)
        if pendingUploads.isEmpty {
            setAssessmentInProgress(false)
        }
    }

    // MARK: - Upload + pipeline

    func process(audioURL: URL, clientId: String, clientName: String?) {
        let uploadId = UUID().uuidString
        enqueueOrRefresh(
            id: uploadId,
            audioURL: audioURL,
            clientId: clientId,
            clientName: clientName,
            visitId: nil,
            error: nil
        )
        Task {
            await processQueued(
                uploadId: uploadId,
                audioURL: audioURL,
                clientId: clientId,
                clientName: clientName,
                existingVisitId: nil
            )
        }
    }

    /// Upload an audio file picked from Files (security-scoped URL).
    func processPickedFile(url: URL, clientId: String, clientName: String?) {
        Task {
            do {
                let accessing = url.startAccessingSecurityScopedResource()
                defer { if accessing { url.stopAccessingSecurityScopedResource() } }

                let data = try Data(contentsOf: url)
                let filename = url.lastPathComponent
                // Copy into Recordings/ so a failed upload can retry without
                // depending on the security-scoped Files bookmark.
                let localURL = try Self.copyIntoRecordings(data: data, preferredName: filename)
                let uploadId = UUID().uuidString
                enqueueOrRefresh(
                    id: uploadId,
                    audioURL: localURL,
                    clientId: clientId,
                    clientName: clientName,
                    visitId: nil,
                    error: nil
                )
                await processQueued(
                    uploadId: uploadId,
                    audioURL: localURL,
                    clientId: clientId,
                    clientName: clientName,
                    existingVisitId: nil
                )
            } catch {
                PostHogService.shared.capture("assessment_upload_failed", properties: [
                    "source": "file_upload",
                ])
                errorMessage = error.palmFriendlyMessage
                withAnimation { isProcessing = false }
                uploadProgress = nil
                setAssessmentInProgress(uploadStore.hasItems)
            }
        }
    }

    private func processQueued(
        uploadId: String,
        audioURL: URL,
        clientId: String,
        clientName: String?,
        existingVisitId: String?
    ) async {
        PostHogService.shared.capture("assessment_process_started", properties: [
            "source": existingVisitId == nil ? "recording" : "retry",
        ])
        withAnimation {
            isProcessing = true
            uploadProgress = existingVisitId == nil ? "Creating assessment..." : "Retrying upload..."
            pipelineSteps = []
            audioSavedNotice = nil
        }
        setAssessmentInProgress(true)
        uploadStore.update(id: uploadId) { item in
            item.attemptCount += 1
            item.lastError = nil
        }

        processingTask?.cancel()
        processingTask = Task {
            do {
                let data = try Data(contentsOf: audioURL)
                let visitId: String
                if let existingVisitId {
                    visitId = existingVisitId
                } else {
                    uploadProgress = "Creating assessment..."
                    let visit = try await api.createVisit(clientId: clientId)
                    PostHogService.shared.capture("assessment_visit_created")
                    visitId = visit.id
                    uploadStore.update(id: uploadId) { $0.visitId = visit.id }
                }

                uploadProgress = "Uploading audio..."
                _ = try await api.uploadAudio(
                    visitId: visitId,
                    audioData: data,
                    filename: audioURL.lastPathComponent,
                    autoProcess: true
                )
                PostHogService.shared.capture("assessment_upload_succeeded", properties: [
                    "source": "recording",
                ])
                clearQueuedAudio(uploadId: uploadId, audioURL: audioURL)

                uploadProgress = "Pipeline running..."
                await pollPipeline(visitId: visitId, clientName: clientName)
            } catch {
                PostHogService.shared.capture("assessment_upload_failed", properties: [
                    "source": "recording",
                ])
                handleUploadFailure(
                    error: error,
                    uploadId: uploadId,
                    audioURL: audioURL,
                    clientId: clientId,
                    clientName: clientName
                )
            }
        }
        await processingTask?.value
    }

    private func enqueueOrRefresh(
        id: String,
        audioURL: URL,
        clientId: String,
        clientName: String?,
        visitId: String?,
        error: String?
    ) {
        let existing = uploadStore.items.first { $0.audioPath == audioURL.path || $0.filename == audioURL.lastPathComponent }
        let item = PendingUpload(
            id: existing?.id ?? id,
            audioPath: audioURL.path,
            clientId: clientId,
            clientName: clientName,
            createdAt: existing?.createdAt ?? Date(),
            attemptCount: existing?.attemptCount ?? 0,
            lastError: error,
            visitId: visitId ?? existing?.visitId
        )
        uploadStore.upsert(item)
    }

    private func clearQueuedAudio(uploadId: String, audioURL: URL) {
        uploadStore.remove(id: uploadId)
        try? FileManager.default.removeItem(at: audioURL)
    }

    private func handleUploadFailure(
        error: Error,
        uploadId: String?,
        audioURL: URL?,
        clientId: String,
        clientName: String?
    ) {
        let message = error.palmFriendlyMessage
        if let uploadId {
            uploadStore.update(id: uploadId) { item in
                item.lastError = message
            }
        } else if let audioURL {
            enqueueOrRefresh(
                id: UUID().uuidString,
                audioURL: audioURL,
                clientId: clientId,
                clientName: clientName,
                visitId: nil,
                error: message
            )
        }
        // Keep the WAV. Trust dies if we delete mid-visit after a bad signal.
        withAnimation { isProcessing = false }
        uploadProgress = nil
        pipelineSteps = []
        audioSavedNotice = "We still have your audio on this iPhone. Retry when you have a signal."
        // Stay "in progress" while audio is queued so session timeout does not
        // treat the caregiver as idle and wipe context.
        setAssessmentInProgress(uploadStore.hasItems)
    }

    private static func copyIntoRecordings(data: Data, preferredName: String) throws -> URL {
        guard let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            throw RecordingError.failedToStart
        }
        let dir = documents.appendingPathComponent("Recordings", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let safeName = preferredName.isEmpty ? "upload-\(UUID().uuidString).wav" : preferredName
        let dest = dir.appendingPathComponent("pending-\(UUID().uuidString)-\(safeName)")
        try data.write(to: dest, options: [.atomic])
        return dest
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
                        // Care plan is written with the contract step. Surface it
                        // as its own checklist row so the packet matches Documents.
                        if key == "contract" {
                            steps.append(("Care Plan", stateStr))
                        }
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
                    uploadProgress = "Connection lost. Your assessment is still processing in the background."
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
        setAssessmentInProgress(uploadStore.hasItems)
        // Set last: RecordView's onReceive uses this as the navigation signal,
        // so all other state must already be in place.
        completedVisitId = visitId
    }
}
