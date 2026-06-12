import AVFoundation
import Foundation

/// Streams live transcription chunks of an in-progress WAV recording
/// to the backend `/live/transcribe` endpoint.
///
/// Key behaviors:
///  * Reads only the NEW PCM bytes since the last chunk (incremental).
///  * Prepends a synthesized RIFF/WAV header to each chunk so Deepgram
///    accepts it as a valid WAV. This is what allows long recordings
///    (> 2.5 min) to keep receiving live transcripts — the original
///    file's header is only valid for an offset of 0, so seeking into
///    the body would otherwise produce raw PCM that the server can't
///    decode.
///  * Appends results into a rolling transcript instead of replacing it.
@MainActor
class LiveTranscriptionService: ObservableObject {
    @Published var segments: [TranscriptSegment] = []
    @Published var isTranscribing = false
    @Published var fullTranscript = ""
    @Published var lastError: String?
    /// True once several chunks have round-tripped successfully but produced
    /// no words — the mic is likely muted, blocked, or picking up silence.
    @Published var noSpeechDetected = false

    private let api: APIService
    private var chunkTimer: Timer?
    /// Prevents overlapping uploads when a slow request outlives the timer
    /// interval — otherwise the same byte range gets transcribed twice.
    private var isSendingChunk = false

    /// PCM bytes already sent for transcription.
    private var lastByteOffset: UInt64 = AudioRecorderService.wavHeaderSize.asUInt64
    /// Whether we've located the real start of PCM data in the WAV file.
    /// CoreAudio writes extra JUNK/FLLR chunks before `data` (~4 KB), so the
    /// canonical 44-byte offset is wrong on real files.
    private var didLocateDataChunk = false
    /// Successful chunks that came back with no words at all.
    private var emptyChunkCount = 0
    /// Wall-clock time when current recording was started (for segment timestamps).
    private var recordingStart: Date = .distantPast
    /// Rolling transcript pieces (one per successful chunk).
    private var transcriptPieces: [String] = []

    private let chunkInterval: TimeInterval = 3
    /// ~5 seconds of mono 16kHz/16bit audio = ~160 KB; we cap chunk size
    /// at 4 MB which is more than 2 minutes of audio in case the timer
    /// is delayed by the OS.
    private let maxChunkBytes: Int = 4 * 1024 * 1024
    /// Need at least ~1 second of new audio (~32 KB) before sending.
    private let minNewBytes: UInt64 = 32_000

    init(api: APIService) {
        self.api = api
    }

    func startTranscribing(recordingURL: URL) {
        chunkTimer?.invalidate()
        chunkTimer = nil

        isTranscribing = true
        lastByteOffset = AudioRecorderService.wavHeaderSize.asUInt64
        didLocateDataChunk = false
        emptyChunkCount = 0
        noSpeechDetected = false
        segments = []
        fullTranscript = ""
        transcriptPieces = []
        lastError = nil
        recordingStart = Date()

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

    // MARK: - Chunking

    private func sendChunk(recordingURL: URL) async {
        guard !isSendingChunk else { return }
        isSendingChunk = true
        defer { isSendingChunk = false }

        guard FileManager.default.fileExists(atPath: recordingURL.path) else {
            lastError = "File not found"
            return
        }

        do {
            // Find where PCM actually starts. AVAudioRecorder (CoreAudio)
            // pads WAV headers with JUNK + FLLR chunks, so `data` usually
            // begins near 4 KB rather than the canonical byte 44.
            if !didLocateDataChunk {
                if let offset = Self.findDataChunkOffset(in: recordingURL) {
                    lastByteOffset = offset
                    didLocateDataChunk = true
                }
                // If the header is still being written, fall through —
                // worst case the first chunk carries a few KB of header
                // bytes, which Deepgram tolerates.
            }

            let attrs = try FileManager.default.attributesOfItem(atPath: recordingURL.path)
            let fileSize = (attrs[.size] as? UInt64) ?? 0
            guard fileSize > lastByteOffset + minNewBytes else { return }

            // Read at most maxChunkBytes from the new tail of the file.
            let availableNewBytes = fileSize - lastByteOffset
            let bytesToRead = min(UInt64(maxChunkBytes), availableNewBytes)
            let readEnd = lastByteOffset + bytesToRead

            let fileHandle = try FileHandle(forReadingFrom: recordingURL)
            defer { fileHandle.closeFile() }

            try fileHandle.seek(toOffset: lastByteOffset)
            let pcmChunk = fileHandle.readData(ofLength: Int(bytesToRead))
            guard pcmChunk.count > Int(minNewBytes) else { return }

            // Wrap the raw PCM tail in a fresh WAV header so Deepgram
            // can decode it without seeing the original RIFF header.
            let wav = Self.wrapPCMInWAV(pcm: pcmChunk)

            let response = try await api.liveTranscribe(audioData: wav, diarize: true)

            // Advance the offset only on a successful round-trip so a
            // network blip doesn't silently drop audio from the
            // rolling transcript.
            lastByteOffset = readEnd
            lastError = nil

            guard !response.transcript.isEmpty else {
                // Several rounds of clean uploads with zero words means the
                // mic is muted/blocked — tell the user instead of showing a
                // silent screen forever.
                emptyChunkCount += 1
                if emptyChunkCount >= 3 && transcriptPieces.isEmpty {
                    noSpeechDetected = true
                }
                return
            }

            emptyChunkCount = 0
            noSpeechDetected = false
            transcriptPieces.append(response.transcript)
            fullTranscript = transcriptPieces.joined(separator: " ")
            segments = mergeSegments(segments, with: response.words, chunkStartSeconds: Date().timeIntervalSince(recordingStart) - response.duration)
        } catch {
            // Don't advance lastByteOffset on failure; we'll retry the
            // same audio range on the next tick.
            lastError = error.localizedDescription
        }
    }

    /// Scan the first few KB of a RIFF/WAV file for the `data` chunk and
    /// return the byte offset where PCM samples begin. Returns nil if the
    /// header is malformed or the chunk hasn't been written yet.
    static func findDataChunkOffset(in url: URL) -> UInt64? {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { handle.closeFile() }
        let header = handle.readData(ofLength: 16 * 1024)
        guard header.count > 12,
              header.prefix(4) == Data("RIFF".utf8) else { return nil }

        // Walk RIFF sub-chunks: [fourCC][size][payload]...
        var i = 12
        while i + 8 <= header.count {
            let fourCC = header.subdata(in: i..<(i + 4))
            let sizeBytes = header.subdata(in: (i + 4)..<(i + 8))
            let size = sizeBytes.withUnsafeBytes { $0.loadUnaligned(as: UInt32.self) }.littleEndian
            if fourCC == Data("data".utf8) {
                return UInt64(i + 8)
            }
            // Chunks are word-aligned; odd sizes are padded with one byte.
            i += 8 + Int(size) + (Int(size) % 2)
        }
        return nil
    }

    /// Build a 44-byte RIFF/WAV header for the given PCM payload.
    /// Mirrors the format produced by AudioRecorderService so chunks
    /// roundtrip cleanly through the server.
    static func wrapPCMInWAV(pcm: Data) -> Data {
        let sampleRate = UInt32(AudioRecorderService.sampleRate)
        let channels = UInt16(AudioRecorderService.channels)
        let bitsPerSample = UInt16(AudioRecorderService.bitDepth)
        let byteRate = sampleRate * UInt32(channels) * UInt32(bitsPerSample / 8)
        let blockAlign = channels * (bitsPerSample / 8)
        let dataSize = UInt32(pcm.count)
        let chunkSize = 36 + dataSize

        var header = Data()
        header.append(contentsOf: Array("RIFF".utf8))
        header.append(contentsOf: chunkSize.littleEndianBytes)
        header.append(contentsOf: Array("WAVE".utf8))

        header.append(contentsOf: Array("fmt ".utf8))
        header.append(contentsOf: UInt32(16).littleEndianBytes)        // PCM fmt chunk size
        header.append(contentsOf: UInt16(1).littleEndianBytes)         // PCM format
        header.append(contentsOf: channels.littleEndianBytes)
        header.append(contentsOf: sampleRate.littleEndianBytes)
        header.append(contentsOf: byteRate.littleEndianBytes)
        header.append(contentsOf: blockAlign.littleEndianBytes)
        header.append(contentsOf: bitsPerSample.littleEndianBytes)

        header.append(contentsOf: Array("data".utf8))
        header.append(contentsOf: dataSize.littleEndianBytes)
        header.append(pcm)
        return header
    }

    // MARK: - Segment Merging

    /// Convert Deepgram words into TranscriptSegment objects shifted to
    /// their absolute timeline position, and append them to the
    /// previously collected segments. Speaker IDs from chunk to chunk
    /// may not be stable (Deepgram diarizes per request), but the user
    /// still sees consecutive speaker turns rendered correctly within
    /// each chunk.
    private func mergeSegments(_ existing: [TranscriptSegment], with newWords: [TranscriptWord], chunkStartSeconds: TimeInterval) -> [TranscriptSegment] {
        guard !newWords.isEmpty else { return existing }

        let offset = max(0, chunkStartSeconds)
        let shifted = newWords.map { w -> TranscriptWord in
            TranscriptWord(
                word: w.word,
                start: w.start + offset,
                end: w.end + offset,
                confidence: w.confidence,
                speaker: w.speaker
            )
        }

        var built: [TranscriptSegment] = []
        var currentSpeaker = shifted[0].speaker ?? 0
        var currentWords: [TranscriptWord] = []
        var segmentStart = shifted[0].start

        for word in shifted {
            let speaker = word.speaker ?? currentSpeaker
            if speaker != currentSpeaker && !currentWords.isEmpty {
                built.append(TranscriptSegment(
                    speaker: currentSpeaker,
                    text: currentWords.map { $0.word }.joined(separator: " "),
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
            built.append(TranscriptSegment(
                speaker: currentSpeaker,
                text: currentWords.map { $0.word }.joined(separator: " "),
                words: currentWords,
                startTime: segmentStart,
                endTime: currentWords.last?.end ?? segmentStart
            ))
        }
        return existing + built
    }

    // MARK: - Medical highlighting

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

    static func isMedicalKeyword(_ word: String) -> Bool {
        medicalKeywords.contains(word.lowercased().trimmingCharacters(in: .punctuationCharacters))
    }

    deinit {
        chunkTimer?.invalidate()
    }
}

// MARK: - Little-endian byte helpers

private extension UInt32 {
    var littleEndianBytes: [UInt8] {
        let v = self.littleEndian
        return [
            UInt8(v & 0xff),
            UInt8((v >> 8) & 0xff),
            UInt8((v >> 16) & 0xff),
            UInt8((v >> 24) & 0xff),
        ]
    }
}

private extension UInt16 {
    var littleEndianBytes: [UInt8] {
        let v = self.littleEndian
        return [
            UInt8(v & 0xff),
            UInt8((v >> 8) & 0xff),
        ]
    }
}

private extension Int {
    var asUInt64: UInt64 { UInt64(self) }
}
