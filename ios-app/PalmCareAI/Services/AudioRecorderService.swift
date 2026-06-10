import AVFoundation
import Foundation
import UIKit

class AudioRecorderService: NSObject, ObservableObject, AVAudioRecorderDelegate {
    @Published var isRecording = false
    @Published var duration: TimeInterval = 0
    @Published var recordingURL: URL?
    @Published var audioLevel: Float = 0
    /// Set when the system interrupts recording (phone call, Siri, etc.)
    /// so the UI can show a recoverable banner.
    @Published var isInterrupted = false
    /// Set when the system kills the recording out from under us (media
    /// daemon crash). The partial file in `recordingURL` is still on disk.
    @Published var recordingFailureMessage: String?

    private var audioRecorder: AVAudioRecorder?
    private var timer: Timer?
    private var levelTimer: Timer?
    private var previousIdleTimerDisabled = false
    private var backgroundTaskId: UIBackgroundTaskIdentifier = .invalid
    private var didRegisterNotificationObservers = false

    private var backgroundRecordingEnabled: Bool {
        UserDefaults.standard.bool(forKey: "backgroundRecording")
    }

    // PCM format constants. Kept here so LiveTranscriptionService can
    // synthesize a matching WAV header for incremental chunk uploads.
    static let sampleRate: Double = 16000
    static let channels: UInt32 = 1
    static let bitDepth: UInt32 = 16
    static let wavHeaderSize: Int = 44

    func startRecording() throws {
        let session = AVAudioSession.sharedInstance()
        // .allowBluetoothA2DP is output-only; .allowBluetooth enables HFP for
        // headset microphones (AirPods, etc). Use .measurement mode to disable
        // automatic gain that distorts soft speech in care environments.
        try session.setCategory(
            .playAndRecord,
            mode: .measurement,
            options: [.defaultToSpeaker, .allowBluetooth]
        )
        try session.setActive(true)

        registerSessionObserversIfNeeded()
        beginBackgroundTaskIfNeeded()

        if backgroundRecordingEnabled {
            DispatchQueue.main.async { [weak self] in
                self?.previousIdleTimerDisabled = UIApplication.shared.isIdleTimerDisabled
                UIApplication.shared.isIdleTimerDisabled = true
            }
        }

        guard let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            throw RecordingError.failedToStart
        }
        let recordingsDir = documentsDir.appendingPathComponent("Recordings", isDirectory: true)
        try FileManager.default.createDirectory(
            at: recordingsDir,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.complete]
        )

        let timestamp = Int(Date().timeIntervalSince1970)
        let url = recordingsDir.appendingPathComponent("recording_\(timestamp).wav")
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: recordingsDir.path)

        // WAV (Linear PCM) is used instead of AAC/M4A so the file can be
        // read mid-recording for live transcription. M4A writes its moov
        // atom only on stop(), making it unreadable while recording.
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: AudioRecorderService.sampleRate,
            AVNumberOfChannelsKey: Int(AudioRecorderService.channels),
            AVLinearPCMBitDepthKey: Int(AudioRecorderService.bitDepth),
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false,
        ]

        audioRecorder = try AVAudioRecorder(url: url, settings: settings)
        audioRecorder?.delegate = self
        audioRecorder?.isMeteringEnabled = true

        guard audioRecorder?.record() == true else {
            throw RecordingError.failedToStart
        }
        try? FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)

        recordingURL = url
        isRecording = true
        duration = 0

        // Use RunLoop.common so timers keep firing in the background
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            DispatchQueue.main.async { [weak self] in
                self?.duration += 1
            }
        }
        if let timer { RunLoop.current.add(timer, forMode: .common) }

        levelTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self, let recorder = self.audioRecorder, recorder.isRecording else { return }
            recorder.updateMeters()
            let level = recorder.averagePower(forChannel: 0)
            let normalizedLevel = max(0, (level + 60) / 60)
            DispatchQueue.main.async { [weak self] in
                self?.audioLevel = normalizedLevel
            }
        }
        if let levelTimer { RunLoop.current.add(levelTimer, forMode: .common) }
    }

    func stopRecording() -> URL? {
        audioRecorder?.stop()
        timer?.invalidate()
        timer = nil
        levelTimer?.invalidate()
        levelTimer = nil
        isRecording = false
        isInterrupted = false
        audioLevel = 0

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            UIApplication.shared.isIdleTimerDisabled = self.previousIdleTimerDisabled
        }

        let url = recordingURL
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        endBackgroundTaskIfNeeded()
        return url
    }

    // MARK: - Background Continuity

    /// Hold a UIApplication background task while recording so writes flush
    /// even if the user briefly switches apps before the audio session
    /// reaches the background-audio mode.
    private func beginBackgroundTaskIfNeeded() {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard self.backgroundTaskId == .invalid else { return }
            self.backgroundTaskId = UIApplication.shared.beginBackgroundTask(
                withName: "PalmCareRecording"
            ) { [weak self] in
                self?.endBackgroundTaskIfNeeded()
            }
        }
    }

    private func endBackgroundTaskIfNeeded() {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard self.backgroundTaskId != .invalid else { return }
            UIApplication.shared.endBackgroundTask(self.backgroundTaskId)
            self.backgroundTaskId = .invalid
        }
    }

    // MARK: - Audio Session Observers

    private func registerSessionObserversIfNeeded() {
        guard !didRegisterNotificationObservers else { return }
        didRegisterNotificationObservers = true

        let nc = NotificationCenter.default
        nc.addObserver(
            self,
            selector: #selector(handleInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: nil
        )
        nc.addObserver(
            self,
            selector: #selector(handleRouteChange(_:)),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
        nc.addObserver(
            self,
            selector: #selector(handleMediaServicesReset(_:)),
            name: AVAudioSession.mediaServicesWereResetNotification,
            object: nil
        )
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

        switch type {
        case .began:
            DispatchQueue.main.async { [weak self] in
                self?.isInterrupted = true
            }
        case .ended:
            // Resume only if the system asks us to and we were recording.
            let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            guard options.contains(.shouldResume),
                  let recorder = audioRecorder,
                  isRecording else {
                DispatchQueue.main.async { [weak self] in self?.isInterrupted = false }
                return
            }
            do {
                try AVAudioSession.sharedInstance().setActive(true)
                if !recorder.isRecording {
                    recorder.record()
                }
            } catch {
                // If reactivation fails, surface the interrupted state.
            }
            DispatchQueue.main.async { [weak self] in self?.isInterrupted = false }
        @unknown default:
            break
        }
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        // When headphones unplug or a Bluetooth device disconnects,
        // iOS may pause the recorder. Restart it without losing the file.
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else { return }
        guard isRecording, let recorder = audioRecorder else { return }

        switch reason {
        case .oldDeviceUnavailable, .newDeviceAvailable, .override:
            if !recorder.isRecording {
                recorder.record()
            }
        default:
            break
        }
    }

    @objc private func handleMediaServicesReset(_ notification: Notification) {
        // Rare: media daemon crashed. The recorder is dead, but the WAV bytes
        // written so far are still on disk at `recordingURL` — surface the
        // failure so the UI can offer to save the partial recording instead
        // of losing the visit silently.
        let wasRecording = isRecording
        timer?.invalidate()
        timer = nil
        levelTimer?.invalidate()
        levelTimer = nil
        audioRecorder = nil
        DispatchQueue.main.async { [weak self] in
            self?.isRecording = false
            self?.isInterrupted = false
            if wasRecording {
                self?.recordingFailureMessage = "Recording was stopped by the system. The audio captured so far has been saved — you can upload it now."
            }
        }
    }

    /// Remove recordings left behind by crashes or abandoned uploads. PHI
    /// audio should not accumulate on disk indefinitely; anything older than
    /// `hours` can't belong to an in-flight assessment.
    static func purgeStaleRecordings(olderThan hours: Double = 48) {
        guard let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
        let recordingsDir = documentsDir.appendingPathComponent("Recordings", isDirectory: true)
        guard let files = try? FileManager.default.contentsOfDirectory(
            at: recordingsDir,
            includingPropertiesForKeys: [.contentModificationDateKey]
        ) else { return }

        let cutoff = Date().addingTimeInterval(-hours * 3600)
        for file in files {
            let modified = (try? file.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
            if let modified, modified < cutoff {
                try? FileManager.default.removeItem(at: file)
            }
        }
    }

    func requestPermission() async -> Bool {
        if #available(iOS 17.0, *) {
            return await AVAudioApplication.requestRecordPermission()
        } else {
            return await withCheckedContinuation { continuation in
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        }
    }

    func checkPermissionStatus() -> Bool {
        if #available(iOS 17.0, *) {
            return AVAudioApplication.shared.recordPermission == .granted
        } else {
            return AVAudioSession.sharedInstance().recordPermission == .granted
        }
    }

    // MARK: - AVAudioRecorderDelegate

    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        guard !flag else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            let wasRecording = self.isRecording
            self.isRecording = false
            self.timer?.invalidate()
            self.timer = nil
            self.levelTimer?.invalidate()
            self.levelTimer = nil
            if wasRecording {
                self.recordingFailureMessage = "Recording stopped unexpectedly. The audio captured so far has been saved — you can upload it now."
            }
        }
    }

    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            let wasRecording = self.isRecording
            self.isRecording = false
            self.timer?.invalidate()
            self.timer = nil
            self.levelTimer?.invalidate()
            self.levelTimer = nil
            if wasRecording {
                self.recordingFailureMessage = "Recording stopped due to an audio error. The audio captured so far has been saved — you can upload it now."
            }
        }
    }

    deinit {
        timer?.invalidate()
        levelTimer?.invalidate()
        if didRegisterNotificationObservers {
            NotificationCenter.default.removeObserver(self)
        }
    }
}

enum RecordingError: LocalizedError {
    case failedToStart
    case permissionDenied

    var errorDescription: String? {
        switch self {
        case .failedToStart: return "Failed to start recording. Please check microphone access."
        case .permissionDenied: return "Microphone access is required to record assessments."
        }
    }
}
