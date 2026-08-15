import Foundation

/// Pure live-transcript merge helpers.
///
/// Deepgram diarizes each 3-second chunk independently, so raw speaker IDs
/// are not stable across chunk boundaries. We remap the new chunk so its
/// first speaker continues whoever was last talking, then coalesce only
/// after that remap.
enum LiveTranscriptMerger {
    static func merge(
        existing: [TranscriptSegment],
        newWords: [TranscriptWord],
        chunkStartSeconds: TimeInterval
    ) -> [TranscriptSegment] {
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

        let built = segments(from: shifted)
        let remapped = remap(built, onto: existing)
        return coalesce(existing + remapped)
    }

    /// Whisper (and other undiarized providers) have no speaker IDs. Treat
    /// the text as a continuation of the last turn instead of speaker 0.
    static func appendUndiarized(
        existing: [TranscriptSegment],
        transcript: String,
        now: TimeInterval,
        duration: TimeInterval
    ) -> [TranscriptSegment] {
        let text = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return existing }
        if let last = existing.last {
            var next = existing
            next[next.count - 1] = TranscriptSegment(
                id: last.id,
                speaker: last.speaker,
                text: last.text + " " + text,
                words: last.words,
                startTime: last.startTime,
                endTime: now
            )
            return next
        }
        return [
            TranscriptSegment(
                speaker: 0,
                text: text,
                words: [],
                startTime: max(0, now - duration),
                endTime: now
            )
        ]
    }

    static func segments(from words: [TranscriptWord]) -> [TranscriptSegment] {
        guard !words.isEmpty else { return [] }

        var built: [TranscriptSegment] = []
        var currentSpeaker = words[0].speaker ?? 0
        var currentWords: [TranscriptWord] = []
        var segmentStart = words[0].start

        for word in words {
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
        return built
    }

    /// Map this chunk's first speaker onto whoever was last talking so a
    /// Deepgram 0/1 swap cannot glue two different people together. Other
    /// IDs in the chunk get fresh identities that do not collide with
    /// speakers already on the timeline.
    static func remap(
        _ built: [TranscriptSegment],
        onto existing: [TranscriptSegment]
    ) -> [TranscriptSegment] {
        guard let last = existing.last, let first = built.first else { return built }

        var idMap: [Int: Int] = [first.speaker: last.speaker]
        var nextUnused = (existing.map(\.speaker).max() ?? -1) + 1
        if nextUnused == last.speaker {
            nextUnused += 1
        }

        func mapped(_ raw: Int) -> Int {
            if let already = idMap[raw] { return already }
            let assigned = nextUnused
            idMap[raw] = assigned
            nextUnused += 1
            if nextUnused == last.speaker {
                nextUnused += 1
            }
            return assigned
        }

        return built.map { seg in
            let speaker = mapped(seg.speaker)
            let words = seg.words.map { w in
                TranscriptWord(
                    word: w.word,
                    start: w.start,
                    end: w.end,
                    confidence: w.confidence,
                    speaker: w.speaker.map(mapped)
                )
            }
            return TranscriptSegment(
                id: seg.id,
                speaker: speaker,
                text: seg.text,
                words: words,
                startTime: seg.startTime,
                endTime: seg.endTime
            )
        }
    }

    static func coalesce(_ segs: [TranscriptSegment]) -> [TranscriptSegment] {
        var out: [TranscriptSegment] = []
        for seg in segs {
            let text = seg.text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { continue }
            if let last = out.last, last.speaker == seg.speaker {
                out[out.count - 1] = TranscriptSegment(
                    id: last.id,
                    speaker: last.speaker,
                    text: last.text + " " + text,
                    words: last.words + seg.words,
                    startTime: last.startTime,
                    endTime: seg.endTime
                )
            } else {
                out.append(seg)
            }
        }
        return out
    }
}
