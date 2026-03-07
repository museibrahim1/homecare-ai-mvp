#if DEBUG
import Foundation

@MainActor
class DemoTranscriptionService: ObservableObject {
    @Published var segments: [TranscriptSegment] = []
    @Published var isTranscribing = false
    @Published var fullTranscript = ""

    private var wordTimer: Timer?
    private var dialogueIndex = 0
    private var wordIndex = 0
    private var elapsed: Double = 0
    private let wordInterval: TimeInterval = 0.28

    private struct Line {
        let speaker: Int
        let text: String
    }

    private let dialogue: [Line] = [
        Line(speaker: 0, text: "Good morning Mrs. Johnson, I'm Sarah your home care nurse. How are you feeling today?"),
        Line(speaker: 1, text: "Oh good morning Sarah. I'm doing alright, just a little fatigue this morning."),
        Line(speaker: 0, text: "I see. Let me check your vitals real quick. Can you extend your arm for the blood pressure cuff?"),
        Line(speaker: 1, text: "Sure thing. My diabetes has been acting up a bit this week."),
        Line(speaker: 0, text: "Your blood pressure is one twenty eight over eighty two, that's within normal range. Have you been taking your insulin on schedule?"),
        Line(speaker: 1, text: "Yes, every morning. But I've had some dizziness after meals."),
        Line(speaker: 0, text: "That could be related to your glucose levels. Let me check your medication list. You're on metformin and lisinopril, correct?"),
        Line(speaker: 1, text: "Yes, and the doctor added a new prescription for my cholesterol last week."),
        Line(speaker: 0, text: "Got it. I'll note that in your care plan. Now let's do a quick mobility assessment. Can you stand up from the chair for me?"),
        Line(speaker: 1, text: "I can try. My arthritis in the knees has been worse with the cold weather."),
        Line(speaker: 0, text: "Take your time. I'm right here if you need support. Good, that looks steady. Any falls or near falls since my last visit?"),
        Line(speaker: 1, text: "No falls, but I did feel unsteady in the bathroom Tuesday night."),
        Line(speaker: 0, text: "We should look into grab bars for the bathroom. I'll add that to the therapy recommendations. Your oxygen level is ninety seven percent, heart rate seventy four. Everything looks good overall."),
        Line(speaker: 1, text: "That's a relief. Thank you for being so thorough Sarah."),
        Line(speaker: 0, text: "Of course. I'll update your assessment notes and schedule your next appointment for Thursday. The physical therapy team will follow up on the mobility exercises."),
    ]

    func startTranscribing() {
        isTranscribing = true
        segments = []
        fullTranscript = ""
        dialogueIndex = 0
        wordIndex = 0
        elapsed = 0

        wordTimer = Timer.scheduledTimer(withTimeInterval: wordInterval, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in self.tickWord() }
        }
    }

    func stopTranscribing() {
        wordTimer?.invalidate()
        wordTimer = nil
        isTranscribing = false
    }

    private func tickWord() {
        guard dialogueIndex < dialogue.count else {
            stopTranscribing()
            return
        }

        let line = dialogue[dialogueIndex]
        let allWords = line.text.split(separator: " ").map(String.init)

        guard wordIndex < allWords.count else {
            dialogueIndex += 1
            wordIndex = 0
            elapsed += 0.6
            return
        }

        let word = allWords[wordIndex]
        let wordStart = elapsed
        let wordEnd = elapsed + wordInterval
        elapsed = wordEnd

        let tw = TranscriptWord(
            word: word,
            start: wordStart,
            end: wordEnd,
            confidence: 0.97,
            speaker: line.speaker
        )

        if let lastIdx = segments.lastIndex(where: { $0.speaker == line.speaker && dialogueIndex == segmentDialogueIndex(for: $0) }) {
            let existing = segments[lastIdx]
            let newWords = existing.words + [tw]
            let newText = newWords.map(\.word).joined(separator: " ")
            segments[lastIdx] = TranscriptSegment(
                speaker: line.speaker,
                text: newText,
                words: newWords,
                startTime: existing.startTime,
                endTime: wordEnd
            )
        } else {
            segments.append(TranscriptSegment(
                speaker: line.speaker,
                text: word,
                words: [tw],
                startTime: wordStart,
                endTime: wordEnd
            ))
        }

        fullTranscript = segments.map(\.text).joined(separator: " ")
        wordIndex += 1
    }

    private func segmentDialogueIndex(for segment: TranscriptSegment) -> Int {
        var idx = 0
        for seg in segments {
            if seg.id == segment.id { return idx }
            idx += 1
        }
        return -1
    }

    deinit {
        wordTimer?.invalidate()
    }
}
#endif
