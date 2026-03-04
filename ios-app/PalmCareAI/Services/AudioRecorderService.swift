import AVFoundation
import Foundation
import UIKit

class AudioRecorderService: NSObject, ObservableObject, AVAudioRecorderDelegate {
    @Published var isRecording = false
    @Published var duration: TimeInterval = 0
    @Published var recordingURL: URL?
    @Published var audioLevel: Float = 0

    private var audioRecorder: AVAudioRecorder?
    private var timer: Timer?
    private var levelTimer: Timer?
    private var previousIdleTimerDisabled = false

    private var backgroundRecordingEnabled: Bool {
        UserDefaults.standard.bool(forKey: "backgroundRecording")
    }

    func startRecording() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothA2DP])
        try session.setActive(true, options: .notifyOthersOnDeactivation)

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
        try FileManager.default.createDirectory(at: recordingsDir, withIntermediateDirectories: true)

        let timestamp = Int(Date().timeIntervalSince1970)
        let url = recordingsDir.appendingPathComponent("recording_\(timestamp).m4a")

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVEncoderBitRateKey: 128000,
        ]

        audioRecorder = try AVAudioRecorder(url: url, settings: settings)
        audioRecorder?.delegate = self
        audioRecorder?.isMeteringEnabled = true

        guard audioRecorder?.record() == true else {
            throw RecordingError.failedToStart
        }

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
        audioLevel = 0

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            UIApplication.shared.isIdleTimerDisabled = self.previousIdleTimerDisabled
        }

        let url = recordingURL
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        return url
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
        DispatchQueue.main.async { [weak self] in
            if !flag {
                self?.isRecording = false
                self?.timer?.invalidate()
                self?.timer = nil
                self?.levelTimer?.invalidate()
                self?.levelTimer = nil
            }
        }
    }

    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        DispatchQueue.main.async { [weak self] in
            self?.isRecording = false
            self?.timer?.invalidate()
            self?.timer = nil
            self?.levelTimer?.invalidate()
            self?.levelTimer = nil
        }
    }

    deinit {
        timer?.invalidate()
        levelTimer?.invalidate()
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
