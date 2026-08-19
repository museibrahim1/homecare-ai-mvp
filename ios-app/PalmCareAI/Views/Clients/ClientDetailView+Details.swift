import SwiftUI

extension ClientDetailView {
    // MARK: - Value hygiene

    /// Placeholder / "no signal" strings the AI pipeline and imports emit.
    /// These must never render as a fact value.
    static let noiseValues: Set<String> = [
        "unknown", "n/a", "na", "none", "not applicable", "not provided",
        "not specified", "not assessed", "not documented", "pending",
        "cannot determine", "no data", "no information", "tbd", "-", "—"
    ]

    /// Trims a value and drops it entirely if it's empty or recognizable
    /// noise ("Unable to assess", "Unknown", "insufficient information", …).
    func cleaned(_ raw: String?) -> String? {
        guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else { return nil }
        let lower = raw.lowercased()
        if Self.noiseValues.contains(lower) { return nil }
        if lower.hasPrefix("unknown") { return nil }
        let noisePhrases = ["unable to assess", "insufficient information", "not assessed", "cannot determine", "full assessment required"]
        if noisePhrases.contains(where: { lower.contains($0) }) { return nil }
        return raw
    }

    /// "long_term_memory" → "Long Term Memory".
    func humanized(_ raw: String) -> String {
        raw.replacingOccurrences(of: "_", with: " ").capitalized
    }

    /// Hard cap for prose that isn't structured into goals.
    func truncated(_ raw: String, limit: Int = 180) -> String {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard text.count > limit else { return text }
        let end = text.index(text.startIndex, offsetBy: limit)
        return String(text[..<end]).trimmingCharacters(in: .whitespaces) + "…"
    }

    // MARK: - Row Helpers

    var detailDivider: some View {
        Rectangle()
            .fill(Color.palmChevron.opacity(0.35))
            .frame(height: 1)
            .padding(.horizontal, 16)
    }

    /// Paper App Glass fact row: muted label on the left, ink value on the
    /// right. Tap opens the edit sheet so every fact stays editable.
    func factRow(label: String, value: String) -> some View {
        Button {
            showEditSheet = true
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Text(label)
                    .font(.system(size: 13))
                    .foregroundColor(.palmHint)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 12)
                Text(value)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.palmInk)
                    .multilineTextAlignment(.trailing)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Edit \(label)")
    }

    func emptyFactRow(label: String, hint: String = "Tap to add") -> some View {
        factRow(label: label, value: hint)
    }

    /// Small teal date pill for the Latest Assessment card.
    func datePill(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(.palmPrimary)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Capsule(style: .continuous).fill(Color.palmPrimary.opacity(0.1)))
    }

    // MARK: - Care plan parsing

    /// If a care plan reads like a list of goals ("- Assist with bathing"),
    /// return up to 3 short bullets. Otherwise return [] and the caller
    /// truncates the prose instead.
    func carePlanGoals(_ raw: String) -> [String] {
        let lines = raw
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        var goals: [String] = []
        for line in lines {
            var text: String?
            if let first = line.first, "-•*–●▪".contains(first) {
                text = String(line.dropFirst()).trimmingCharacters(in: .whitespaces)
            } else if let first = line.first, first.isNumber,
                      let sep = line.firstIndex(where: { $0 == "." || $0 == ")" }),
                      line.distance(from: line.startIndex, to: sep) <= 2 {
                text = String(line[line.index(after: sep)...]).trimmingCharacters(in: .whitespaces)
            }
            if let text, !text.isEmpty { goals.append(text) }
        }
        return Array(goals.prefix(3))
    }

    // MARK: - Latest assessment

    struct AssessmentBlock {
        let date: String?
        let sections: [(title: String, content: String)]
    }

    /// The most recent parsed assessment from `medical_notes`, if any.
    func latestAssessment() -> AssessmentBlock? {
        guard let raw = client.medical_notes, !raw.isEmpty else { return nil }
        return parseAssessments(raw).last
    }

    /// A 2–3 line summary for the latest assessment, skipping noise sections.
    /// Prefers an explicit "ASSESSMENT SUMMARY" section.
    func assessmentSummary(_ block: AssessmentBlock) -> String? {
        let good = block.sections.filter { cleaned($0.content) != nil }
        if let summary = good.first(where: { $0.title.uppercased().contains("SUMMARY") }) {
            return summary.content
        }
        let combined = good.prefix(2)
            .map { "\($0.title.capitalized): \($0.content)" }
            .joined(separator: "  ")
        return combined.isEmpty ? nil : combined
    }

    /// Best matching visit to open from the Latest Assessment card — newest
    /// client visit, or nil if the client has none.
    var latestAssessmentVisit: Visit? {
        clientVisitsNewestFirst.first
    }

    func parseAssessments(_ raw: String) -> [AssessmentBlock] {
        let blocks = raw.components(separatedBy: "==")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        var assessments: [AssessmentBlock] = []
        var currentDate: String?
        var currentSections: [(String, String)] = []
        var currentTitle: String?
        var currentContent: [String] = []

        func flushSection() {
            if let title = currentTitle {
                let content = currentContent.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                if !content.isEmpty {
                    currentSections.append((title, content))
                }
            }
            currentTitle = nil
            currentContent = []
        }

        func flushAssessment() {
            flushSection()
            if !currentSections.isEmpty {
                assessments.append(AssessmentBlock(date: currentDate, sections: currentSections))
            }
            currentDate = nil
            currentSections = []
        }

        let fullText = blocks.joined(separator: "\n")
        let lines = fullText.components(separatedBy: "\n")

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty { continue }

            if trimmed.hasPrefix("ASSESSMENT DATE:") {
                flushAssessment()
                currentDate = trimmed.replacingOccurrences(of: "ASSESSMENT DATE:", with: "").trimmingCharacters(in: .whitespaces)
                continue
            }

            let sectionHeaders = [
                "ASSESSMENT SUMMARY:", "ADL STATUS:", "ADL Score:",
                "IADL STATUS:", "IADL Score:", "SAFETY:", "MENTAL HEALTH:",
                "CAREGIVER:", "CARE RECOMMENDATIONS:", "RISK FACTORS:",
                "MEDICATIONS:", "ALLERGIES:", "PHYSICIAN:"
            ]

            let isHeader = sectionHeaders.contains(where: { trimmed.hasPrefix($0) })
            if isHeader {
                flushSection()
                guard let colonIdx = trimmed.firstIndex(of: ":") else { continue }
                let headerPart = String(trimmed[...colonIdx]).replacingOccurrences(of: ":", with: "")
                let valuePart = String(trimmed[trimmed.index(after: colonIdx)...]).trimmingCharacters(in: .whitespaces)
                currentTitle = headerPart
                if !valuePart.isEmpty {
                    currentContent.append(valuePart)
                }
            } else {
                if currentTitle == nil {
                    currentTitle = "Notes"
                }
                currentContent.append(trimmed)
            }
        }

        flushAssessment()
        return assessments
    }

    // MARK: - Visit row

    func visitRow(_ visit: Visit) -> some View {
        let visitStatusColor: Color = {
            switch visit.status.lowercased() {
            case "completed": return .palmGreen
            case "processing": return .palmBlue
            case "pending": return .palmOrange
            default: return .palmSecondary
            }
        }()

        return HStack(spacing: 12) {
            Circle()
                .fill(visitStatusColor.opacity(0.12))
                .frame(width: 34, height: 34)
                .overlay(
                    Image(systemName: visit.status.lowercased() == "completed" ? "checkmark" : "clock")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(visitStatusColor)
                        .accessibilityHidden(true)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text("Assessment")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                Text(formattedDate(visit.created_at))
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
            }

            Spacer()

            Text(visit.displayStatus)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(visitStatusColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(visitStatusColor.opacity(0.1))
                .cornerRadius(10)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    func formattedDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }
        guard let parsedDate = date else { return isoString }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .short
        return display.string(from: parsedDate)
    }
}
