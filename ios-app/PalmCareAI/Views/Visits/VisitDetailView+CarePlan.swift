import SwiftUI

extension VisitDetailView {
    // MARK: - Care Plan Tab (Paper Pipeline Glass → Care Plan)

    var carePlanTab: some View {
        VStack(spacing: 0) {
            if hasCarePlanContent {
                VStack(spacing: 0) {
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("PLAN OF CARE")
                                    .font(.system(size: 11, weight: .semibold))
                                    .tracking(0.8)
                                    .foregroundColor(.palmPrimary)
                                Text("From the visit")
                                    .font(.system(size: 20, weight: .bold))
                                    .tracking(-0.3)
                                    .foregroundColor(.palmText)
                            }

                            if let summary = carePlanSummaryText {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("SUMMARY")
                                        .font(.system(size: 11, weight: .semibold))
                                        .tracking(0.8)
                                        .foregroundColor(.palmSecondary)
                                    Text(summary)
                                        .font(.system(size: 14))
                                        .foregroundColor(.palmText)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }

                            ForEach(Array(paperCarePlanGoals.enumerated()), id: \.element.id) { index, goal in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("GOAL \(index + 1) · \(goal.category.uppercased())")
                                        .font(.system(size: 11, weight: .semibold))
                                        .tracking(0.8)
                                        .foregroundColor(.palmPrimary)
                                    Text(goal.title)
                                        .font(.system(size: 15, weight: .semibold))
                                        .tracking(-0.15)
                                        .foregroundColor(.palmText)
                                        .fixedSize(horizontal: false, vertical: true)

                                    if let approach = goal.approach, !approach.isEmpty {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("Approach")
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundColor(.palmSecondary)
                                            Text(approach)
                                                .font(.system(size: 13))
                                                .foregroundColor(Color(red: 30 / 255, green: 41 / 255, blue: 59 / 255))
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                    }

                                    if let frequency = goal.frequency, !frequency.isEmpty {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("Frequency")
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundColor(.palmSecondary)
                                            Text(frequency)
                                                .font(.system(size: 13))
                                                .foregroundColor(Color(red: 30 / 255, green: 41 / 255, blue: 59 / 255))
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                    }
                                }
                                .padding(.top, 12)
                                .overlay(alignment: .top) {
                                    Rectangle()
                                        .fill(Color.palmText.opacity(0.08))
                                        .frame(height: 1)
                                }
                            }

                            if paperCarePlanGoals.isEmpty, let plan = resolvedCarePlanText, !plan.isEmpty {
                                Text(plan)
                                    .font(.system(size: 14))
                                    .foregroundColor(.palmText)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .padding(.top, 8)
                            }

                            if !carePlanServiceLines.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("SERVICES")
                                        .font(.system(size: 11, weight: .semibold))
                                        .tracking(0.8)
                                        .foregroundColor(.palmPrimary)
                                    ForEach(carePlanServiceLines, id: \.self) { line in
                                        Text(line)
                                            .font(.system(size: 13))
                                            .foregroundColor(.palmText)
                                    }
                                }
                                .padding(.top, 12)
                                .overlay(alignment: .top) {
                                    Rectangle()
                                        .fill(Color.palmText.opacity(0.08))
                                        .frame(height: 1)
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 18)
                        .padding(.bottom, 12)
                    }

                    Button {
                        Task { await exportFile(type: "care-plan.pdf") }
                    } label: {
                        Text("Approve care plan")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(
                                Capsule(style: .continuous)
                                    .fill(Color.palmPrimary)
                            )
                            .shadow(color: PalmGlass.tealShadow, radius: 14, y: 8)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                    .accessibilityLabel("Approve care plan")
                }
                .palmGlassCard(radius: 28, fillOpacity: 0.62)
            } else if tabFetchFailed.contains("care_plan") {
                tabErrorState(tab: "care_plan")
            } else {
                documentEmptyState(
                    step: "care_plan",
                    icon: "list.clipboard",
                    title: "No Care Plan",
                    waitingMessage: "The care plan is written with the service agreement. It will appear here when that step finishes."
                )
            }
        }
    }

    var hasCarePlanContent: Bool {
        !(resolvedCarePlanText ?? "").isEmpty
            || !paperCarePlanGoals.isEmpty
            || !carePlanServiceLines.isEmpty
    }

    var resolvedCarePlanText: String? {
        if let text = carePlanText?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
            return text
        }
        if let text = visit?.client?.care_plan?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
            return text
        }
        return nil
    }

    /// First paragraph of the free-text plan, used as the Paper SUMMARY block.
    var carePlanSummaryText: String? {
        guard let plan = resolvedCarePlanText, !plan.isEmpty else { return nil }
        let first = plan
            .components(separatedBy: CharacterSet.newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty }
        return first
    }

    struct PaperCarePlanGoal: Identifiable {
        let id: String
        let category: String
        let title: String
        let approach: String?
        let frequency: String?
    }

    /// Prefer structured goals from the contract schedule; fall back to short/long lists.
    var paperCarePlanGoals: [PaperCarePlanGoal] {
        if let structured = structuredPaperGoals, !structured.isEmpty {
            return structured
        }
        return legacyPaperGoals
    }

    private var structuredPaperGoals: [PaperCarePlanGoal]? {
        guard let schedule = contract?.schedule else { return nil }
        guard let rawGoals = schedule["care_plan_goals"]?.value as? [String: Any] else { return nil }

        // Support either [{category,title,approach,frequency}] or {short_term:[String],…}
        if let list = rawGoals["goals"] as? [[String: Any]] {
            return list.enumerated().compactMap { idx, item in
                let title = (item["title"] as? String)?
                    .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                guard !title.isEmpty else { return nil }
                return PaperCarePlanGoal(
                    id: "g\(idx)",
                    category: (item["category"] as? String) ?? "Care",
                    title: title,
                    approach: item["approach"] as? String,
                    frequency: item["frequency"] as? String
                )
            }
        }

        let mapping: [(String, String)] = [
            ("short_term", "Personal Care"),
            ("long_term", "Maintenance"),
            ("maintenance", "Support"),
        ]
        var out: [PaperCarePlanGoal] = []
        for (key, category) in mapping {
            let lines = (rawGoals[key] as? [Any])?
                .compactMap { $0 as? String }
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty } ?? []
            for (i, line) in lines.enumerated() {
                out.append(PaperCarePlanGoal(
                    id: "\(key)-\(i)",
                    category: category,
                    title: line,
                    approach: nil,
                    frequency: nil
                ))
            }
        }
        return out
    }

    private var legacyPaperGoals: [PaperCarePlanGoal] {
        carePlanGoalSections.flatMap { section in
            section.lines.enumerated().map { i, line in
                PaperCarePlanGoal(
                    id: "\(section.title)-\(i)",
                    category: section.title.replacingOccurrences(of: " goals", with: ""),
                    title: line,
                    approach: nil,
                    frequency: nil
                )
            }
        }
    }

    struct CarePlanGoalSection: Identifiable {
        var id: String { title }
        let title: String
        let icon: String
        let color: Color
        let lines: [String]
    }

    var carePlanGoalSections: [CarePlanGoalSection] {
        guard let schedule = contract?.schedule else { return [] }
        guard let rawGoals = schedule["care_plan_goals"]?.value as? [String: Any] else { return [] }

        let mapping: [(String, String, String, Color)] = [
            ("short_term", "Short-term goals", "flag.fill", .palmBlue),
            ("long_term", "Long-term goals", "flag.2.crossed.fill", .palmPurple),
            ("maintenance", "Maintenance goals", "arrow.triangle.2.circlepath", .palmGreen),
        ]

        return mapping.compactMap { key, title, icon, color in
            let lines = (rawGoals[key] as? [Any])?
                .compactMap { $0 as? String }
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty } ?? []
            guard !lines.isEmpty else { return nil }
            return CarePlanGoalSection(title: title, icon: icon, color: color, lines: lines)
        }
    }

    var carePlanServiceLines: [String] {
        guard let services = contract?.services else { return [] }
        return services.compactMap { item -> String? in
            guard let dict = item.value as? [String: Any] else { return nil }
            let name = (dict["name"] as? String) ?? (dict["service"] as? String) ?? "Service"
            if let rate = dict["rate"] {
                let unit = dict["unit"] as? String ?? "hour"
                return "\(name) · $\(rate)/\(unit)"
            }
            return name
        }
    }
}
