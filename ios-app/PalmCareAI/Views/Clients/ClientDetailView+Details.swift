import SwiftUI

extension ClientDetailView {
    // MARK: - Row Helpers

    var detailDivider: some View {
        Divider().padding(.leading, 54)
    }

    func detailRow(icon: String, label: String, value: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(color)
                .frame(width: 30, height: 30)
                .background(color.opacity(0.1))
                .cornerRadius(8)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.palmSecondary)
                Text(value)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.palmText)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    func medicalNotesView(_ rawNotes: String) -> some View {
        let assessments = parseAssessments(rawNotes)

        return VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "note.text")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmSecondary)
                    .frame(width: 30, height: 30)
                    .background(Color.palmSecondary.opacity(0.1))
                    .cornerRadius(8)

                Text("Medical Notes")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.palmSecondary)

                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)

            if assessments.isEmpty {
                Text(rawNotes)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.palmText)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 14)
                    .padding(.bottom, 10)
            } else {
                ForEach(Array(assessments.enumerated()), id: \.offset) { idx, assessment in
                    VStack(alignment: .leading, spacing: 10) {
                        if let date = assessment.date {
                            HStack(spacing: 6) {
                                Image(systemName: "calendar")
                                    .font(.system(size: 11))
                                    .foregroundColor(.palmPrimary)
                                Text("Assessment: \(date)")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.palmPrimary)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.palmPrimary.opacity(0.08))
                            .cornerRadius(8)
                        }

                        ForEach(Array(assessment.sections.enumerated()), id: \.offset) { _, section in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(section.title)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.palmText)

                                Text(section.content)
                                    .font(.system(size: 13, weight: .regular))
                                    .foregroundColor(.palmText.opacity(0.85))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)

                    if idx < assessments.count - 1 {
                        Divider()
                            .background(Color.palmSecondary.opacity(0.15))
                            .padding(.horizontal, 14)
                    }
                }
            }
        }
    }

    struct AssessmentBlock {
        let date: String?
        let sections: [(title: String, content: String)]
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
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmText)
                Text(formattedDate(visit.created_at))
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
            }

            Spacer()

            Text(visit.status.capitalized)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(visitStatusColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(visitStatusColor.opacity(0.1))
                .cornerRadius(10)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
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
