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
    private let chunkInterval: TimeInterval = 8
    private let maxChunkBytes: Int = 2 * 1024 * 1024 // 2 MB cap per request

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
    }

    func stopTranscribing() {
        chunkTimer?.invalidate()
        chunkTimer = nil
        isTranscribing = false
    }

    private func sendChunk(recordingURL: URL) async {
        guard FileManager.default.fileExists(atPath: recordingURL.path) else { return }

        do {
            let attrs = try FileManager.default.attributesOfItem(atPath: recordingURL.path)
            let fileSize = (attrs[.size] as? UInt64) ?? 0

            guard fileSize > lastByteOffset + 1000 else { return }

            let handle = try FileHandle(forReadingFrom: recordingURL)
            defer { try? handle.close() }

            handle.seek(toFileOffset: lastByteOffset)
            let bytesToRead = min(Int(fileSize - lastByteOffset), maxChunkBytes)
            let chunkData = handle.readData(ofLength: bytesToRead)

            guard chunkData.count > 1000 else { return }

            let newOffset = lastByteOffset + UInt64(chunkData.count)

            let response = try await api.liveTranscribe(audioData: chunkData, diarize: true)

            lastByteOffset = newOffset

            guard !response.transcript.isEmpty else { return }

            let newSegments = buildSegments(from: response.words)
            self.segments = newSegments
            self.fullTranscript = response.transcript
            self.lastChunkEnd = response.duration
        } catch {
            // Transient network errors are expected during live recording; skip this chunk
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
