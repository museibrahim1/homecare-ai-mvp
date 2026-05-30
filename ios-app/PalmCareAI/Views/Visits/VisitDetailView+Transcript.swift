import SwiftUI

extension VisitDetailView {
    var transcriptTab: some View {
        VStack(spacing: 14) {
            if let segments = transcript?.segments, !segments.isEmpty {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Transcript")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.palmText)
                        if let wc = transcript?.word_count, let dur = transcript?.total_duration_ms {
                            Text("\(wc) words · \(formatDuration(dur))")
                                .font(.system(size: 12))
                                .foregroundColor(.palmSecondary)
                        }
                    }
                    Spacer()
                }

                ForEach(Array(segments.enumerated()), id: \.offset) { _, segment in
                    transcriptBubble(segment)
                }
            } else if tabFetchFailed.contains(1) {
                tabErrorState(tab: 1)
            } else {
                emptyState(icon: "text.quote", title: "No Transcript", message: "The transcript will appear here once the audio has been processed.")
            }
        }
    }

    func transcriptBubble(_ segment: VisitTranscriptSegment) -> some View {
        let speaker = segment.speaker_label ?? "Speaker"
        let isSpeaker1 = speaker.contains("1") || speaker.lowercased().contains("caregiver")
        let color: Color = isSpeaker1 ? .palmPrimary : .palmBlue

        return VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 22, height: 22)
                    .overlay(
                        Text(String(speaker.prefix(1)))
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(color)
                    )
                Text(speaker)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(color)
                if let start = segment.start_ms {
                    Text(formatDuration(start))
                        .font(.system(size: 10))
                        .foregroundColor(.palmSecondary)
                }
                Spacer()
            }

            Text(segment.text)
                .font(.system(size: 14))
                .foregroundColor(.palmText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }

    // MARK: - Billables Tab

}
