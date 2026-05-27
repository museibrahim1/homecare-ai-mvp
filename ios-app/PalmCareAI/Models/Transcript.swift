import Foundation

struct LiveTranscriptResponse: Codable {
    let transcript: String
    let words: [TranscriptWord]
    let confidence: Double
    let duration: Double
    let provider: String
}

struct TranscriptWord: Codable, Identifiable {
    let word: String
    let start: Double
    let end: Double
    let confidence: Double
    let speaker: Int?

    var id: String { "\(start)-\(end)-\(word)" }
}

struct TranscriptSegment: Identifiable {
    let id = UUID()
    let speaker: Int
    let text: String
    let words: [TranscriptWord]
    let startTime: Double
    let endTime: Double

    var speakerLabel: String {
        switch speaker {
        case 0: return "Speaker 1"
        case 1: return "Speaker 2"
        default: return "Speaker \(speaker + 1)"
        }
    }
}

struct VisitTranscriptResponse: Codable {
    let segments: [VisitTranscriptSegment]?
    let total_duration_ms: Int?
    let word_count: Int?
    let source: String?
}

struct VisitTranscriptSegment: Codable, Identifiable {
    let id: String?
    let visit_id: String?
    let start_ms: Int?
    let end_ms: Int?
    let text: String
    let speaker_label: String?

    var stableId: String { id ?? UUID().uuidString }
}
