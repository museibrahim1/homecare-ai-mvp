import AVFoundation
import Foundation

@MainActor
class LiveTranscriptionService: ObservableObject {
    @Published var segments: [TranscriptSegment] = []
    @Published var isTranscribing = false
    @Published var fullTranscript = ""

    private let api: APIService
    private var chunkTimer: Timer?
    private var lastChunkEnd: TimeInterval = 0
    private var lastByteOffset: UInt64 = 0
    private let chunkInterval: TimeInterval = 5
    private let maxChunkBytes: Int = 5 * 1024 * 1024 // 5 MB cap (WAV files are larger than AAC)
    @Published var lastError: String?

    private static let medicalKeywords: Set<String> = [
        "fever", "fatigue", "headache", "headaches", "diabetes", "hypertension",
        "acetaminophen", "ibuprofen", "aspirin", "medication", "medications",
        "diagnosis", "symptoms", "blood pressure", "heart rate", "oxygen",
        "pain", "chronic", "acute", "allergies", "asthma", "arthritis",
        "insulin", "glucose", "cholesterol", "dementia", "alzheimer",
        "stroke", "cancer", "infection", "wound", "mobility", "cognitive",
        "depression", "anxiety", "nausea", "dizziness", "swelling",
        "breathing", "cough", "shortness of breath", "chest pain",
        "fall", "falls", "fracture", "surgery", "therapy", "physical therapy",
        "occupational therapy", "speech therapy", "hospice", "palliative",
        "vitals", "assessment", "care plan", "discharge", "admission",
        "prescription", "dosage", "refill", "pharmacy", "nurse", "doctor",
        "caregiver", "patient", "client", "visit", "appointment",
    ]

    init(api: APIService) {
        self.api = api
    }

    func startTranscribing(recordingURL: URL) {
        // Prevent duplicate timers when start is triggered repeatedly.
        chunkTimer?.invalidate()
        chunkTimer = nil
        isTranscribing = true
        lastChunkEnd = 0
        lastByteOffset = 0
        segments = []
        fullTranscript = ""

        chunkTimer = Timer.scheduledTimer(withTimeInterval: chunkInterval, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                await self.sendChunk(recordingURL: recordingURL)
            }
        }
        if let t = chunkTimer { RunLoop.current.add(t, forMode: .common) }
    }

    func stopTranscribing() {
        chunkTimer?.invalidate()
        chunkTimer = nil
        isTranscribing = false
    }

    private func sendChunk(recordingURL: URL) async {
        guard FileManager.default.fileExists(atPath: recordingURL.path) else {
            lastError = "File not found"
            return
        }

        do {
            let attrs = try FileManager.default.attributesOfItem(atPath: recordingURL.path)
            let fileSize = (attrs[.size] as? UInt64) ?? 0

            // WAV at 16kHz/16bit/mono = ~32KB/sec. Need at least ~2 sec of audio.
            let minBytes: UInt64 = 64_000
            guard fileSize > minBytes, fileSize > lastByteOffset + minBytes else { return }

            let audioData = try Data(contentsOf: recordingURL)
            guard audioData.count > Int(minBytes) else { return }

            let cappedData: Data
            if audioData.count > maxChunkBytes {
                cappedData = audioData.prefix(maxChunkBytes)
            } else {
                cappedData = audioData
            }

            lastByteOffset = UInt64(audioData.count)
            lastError = nil

            let response = try await api.liveTranscribe(audioData: cappedData, diarize: true)

            guard !response.transcript.isEmpty else { return }

            let newSegments = buildSegments(from: response.words)
            self.segments = newSegments
            self.fullTranscript = response.transcript
            self.lastChunkEnd = response.duration
        } catch {
            lastError = error.localizedDescription
        }
    }

    private func buildSegments(from words: [TranscriptWord]) -> [TranscriptSegment] {
        guard !words.isEmpty else { return [] }

        var segments: [TranscriptSegment] = []
        var currentSpeaker = words[0].speaker ?? 0
        var currentWords: [TranscriptWord] = []
        var segmentStart = words[0].start

        for word in words {
            let speaker = word.speaker ?? currentSpeaker
            if speaker != currentSpeaker && !currentWords.isEmpty {
                let text = currentWords.map { $0.word }.joined(separator: " ")
                segments.append(TranscriptSegment(
                    speaker: currentSpeaker,
                    text: text,
                    words: currentWords,
                    startTime: segmentStart,
                    endTime: currentWords.last?.end ?? segmentStart
                ))
                currentWords = []
                segmentStart = word.start
                currentSpeaker = speaker
            }
            currentWords.append(word)
        }

        if !currentWords.isEmpty {
            let text = currentWords.map { $0.word }.joined(separator: " ")
            segments.append(TranscriptSegment(
                speaker: currentSpeaker,
                text: text,
                words: currentWords,
                startTime: segmentStart,
                endTime: currentWords.last?.end ?? segmentStart
            ))
        }

        return segments
    }

    static func isMedicalKeyword(_ word: String) -> Bool {
        medicalKeywords.contains(word.lowercased().trimmingCharacters(in: .punctuationCharacters))
    }

    deinit {
        chunkTimer?.invalidate()
    }
}
