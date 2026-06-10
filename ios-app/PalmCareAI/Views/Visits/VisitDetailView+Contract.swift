import SwiftUI

extension VisitDetailView {
    var currentStyle: ContractStyle {
        builtInContractStyles.first { $0.id == selectedContractStyle } ?? builtInContractStyles[1]
    }

    var contractTab: some View {
        VStack(spacing: 0) {
            if let c = contract {
                contractHeader(c)
                    .padding(.bottom, 14)

                currentStyleBadge
                    .padding(.bottom, 10)

                contractRateCards(c)
                    .padding(.bottom, 14)
                contractServicesSection(c)
                contractScheduleSection(c)
                contractDocumentSection(c)
            } else if tabFetchFailed.contains(4) {
                tabErrorState(tab: 4)
            } else {
                emptyState(icon: "doc.text.fill", title: "No Contract", message: "The contract will appear here once the assessment has been fully processed.")
            }
        }
    }

    func contractHeader(_ c: VisitContract) -> some View {
        let accent = currentStyle.accentColor
        let layout = currentStyle.layoutType
        let isClassic = layout == .classic
        let isElegant = layout == .elegant
        let isProfessional = layout == .professional
        let titleFont: Font = isClassic ? .system(size: 18, weight: .bold, design: .serif) : (isElegant ? .system(size: 18, weight: .heavy) : .system(size: 17, weight: .bold))

        return VStack(spacing: 0) {
            if isProfessional || layout == .clinical {
                Rectangle()
                    .fill(LinearGradient(colors: currentStyle.previewColors, startPoint: .leading, endPoint: .trailing))
                    .frame(height: 4)
                    .cornerRadius(2)
                    .padding(.bottom, 12)
            }

            if isElegant {
                Rectangle()
                    .fill(LinearGradient(colors: currentStyle.previewColors, startPoint: .leading, endPoint: .trailing))
                    .frame(width: 50, height: 2)
                    .padding(.bottom, 8)
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(c.title ?? "Service Agreement")
                        .font(titleFont)
                        .foregroundColor(isElegant || isProfessional ? accent : .palmText)
                    if let status = c.status {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(status == "active" ? Color.palmGreen : Color.palmOrange)
                                .frame(width: 6, height: 6)
                            Text(status.capitalized)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(status == "active" ? .palmGreen : .palmOrange)
                        }
                    }
                }
                Spacer()

                Button { showStylePicker = true } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "paintbrush.fill")
                            .font(.system(size: 12))
                        Text("Style")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(accent)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(accent.opacity(0.08))
                    .cornerRadius(8)
                }

                Menu {
                    Button { showEmailSheet = true } label: {
                        Label("Email Agreement", systemImage: "paperplane.fill")
                    }
                    Divider()
                    Button { Task { await exportFile(type: "contract.pdf") } } label: {
                        Label("Download PDF", systemImage: "arrow.down.doc.fill")
                    }
                    Button { Task { await exportFile(type: "contract.docx") } } label: {
                        Label("Download DOCX", systemImage: "doc.fill")
                    }
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(accent)
                        .frame(width: 36, height: 36)
                        .background(accent.opacity(0.08))
                        .cornerRadius(isClassic ? 4 : 10)
                }
            }

            if isClassic {
                Rectangle().fill(accent).frame(height: 1).padding(.top, 10)
            }
        }
        .sheet(isPresented: $showStylePicker) {
            ContractStylesView(selectedStyleId: $selectedContractStyle, contractTitle: c.title)
        }
    }

    var currentStyleBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: currentStyle.icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(currentStyle.accentColor)
            Text("Using \(currentStyle.name) style")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.palmSecondary)
            Spacer()
            Button {
                showStylePicker = true
            } label: {
                Text("Change")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(currentStyle.accentColor)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(currentStyle.accentColor.opacity(0.04))
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(currentStyle.accentColor.opacity(0.1), lineWidth: 1))
    }

    func contractRateCards(_ c: VisitContract) -> some View {
        let accent = currentStyle.accentColor
        let layout = currentStyle.layoutType
        let isClassic = layout == .classic
        let isMinimal = layout == .minimal
        let isElegant = layout == .elegant
        let radius: CGFloat = isClassic ? 4 : (isMinimal ? 0 : 12)
        let valueFont: Font = isClassic ? .system(size: 20, weight: .bold, design: .serif) : (isElegant ? .system(size: 22, weight: .heavy) : .system(size: 20, weight: .bold))

        return HStack(spacing: isMinimal ? 1 : 10) {
            if let rate = c.hourly_rate {
                VStack(spacing: 4) {
                    Text("$\(String(format: "%.2f", rate))")
                        .font(valueFont)
                        .foregroundColor(accent)
                    Text("per hour")
                        .font(.system(size: 11, weight: isClassic ? .regular : .medium, design: isClassic ? .serif : .default))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(isMinimal ? Color.clear : accent.opacity(0.06))
                .cornerRadius(radius)
                .overlay(
                    RoundedRectangle(cornerRadius: radius)
                        .stroke(isMinimal ? accent.opacity(0.08) : accent.opacity(0.15), lineWidth: isMinimal ? 0.5 : 1)
                )
            }
            if let hours = c.weekly_hours {
                VStack(spacing: 4) {
                    Text("\(String(format: "%.0f", hours))h")
                        .font(valueFont)
                        .foregroundColor(accent.opacity(0.75))
                    Text("per week")
                        .font(.system(size: 11, weight: isClassic ? .regular : .medium, design: isClassic ? .serif : .default))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(isMinimal ? Color.clear : accent.opacity(0.04))
                .cornerRadius(radius)
                .overlay(
                    RoundedRectangle(cornerRadius: radius)
                        .stroke(isMinimal ? accent.opacity(0.08) : accent.opacity(0.12), lineWidth: isMinimal ? 0.5 : 1)
                )
            }
            if let rate = c.hourly_rate, let hours = c.weekly_hours {
                VStack(spacing: 4) {
                    Text("$\(String(format: "%.0f", rate * hours))")
                        .font(valueFont)
                        .foregroundColor(accent)
                    Text("per week")
                        .font(.system(size: 11, weight: isClassic ? .regular : .medium, design: isClassic ? .serif : .default))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(isMinimal ? Color.clear : accent.opacity(0.06))
                .cornerRadius(radius)
                .overlay(
                    RoundedRectangle(cornerRadius: radius)
                        .stroke(isMinimal ? accent.opacity(0.08) : accent.opacity(0.15), lineWidth: isMinimal ? 0.5 : 1)
                )
            }
        }
    }

    func contractServicesSection(_ c: VisitContract) -> some View {
        let accent = currentStyle.accentColor
        let layout = currentStyle.layoutType
        let isClassic = layout == .classic
        let isMinimal = layout == .minimal
        let isElegant = layout == .elegant
        let isProfessional = layout == .professional
        let sectionRadius: CGFloat = isClassic ? 4 : (isMinimal ? 0 : 12)
        let headingFont: Font = isClassic ? .system(size: 15, weight: .bold, design: .serif) : (isElegant ? .system(size: 16, weight: .heavy) : .system(size: 15, weight: .bold))

        return Group {
            if let services = c.services, !services.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    if isProfessional || layout == .clinical {
                        Rectangle().fill(accent).frame(height: 3).cornerRadius(1.5)
                    }

                    HStack(spacing: 6) {
                        if !isMinimal {
                            Image(systemName: layout == .clinical ? "cross.case.fill" : "list.clipboard.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(accent)
                        }
                        Text("Services")
                            .font(headingFont)
                            .foregroundColor(isMinimal ? .palmText.opacity(0.7) : .palmText)
                        Spacer()
                        Text("\(services.count) services")
                            .font(.system(size: 12, design: isClassic ? .serif : .default))
                            .foregroundColor(.palmSecondary)
                    }

                    if isMinimal {
                        Rectangle().fill(Color.gray.opacity(0.15)).frame(height: 0.5)
                    }

                    ForEach(Array(services.enumerated()), id: \.offset) { _, svc in
                        if let dict = svc.value as? [String: Any] {
                            let name = dict["name"] as? String ?? "Service"
                            let desc = dict["description"] as? String ?? ""
                            let freq = dict["frequency"] as? String
                            let priority = dict["priority"] as? String

                            HStack(alignment: .top, spacing: 10) {
                                if !isMinimal {
                                    Image(systemName: serviceIcon(for: name))
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(accent)
                                        .frame(width: 28, height: 28)
                                        .background(accent.opacity(0.08))
                                        .cornerRadius(isClassic ? 4 : 7)
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(name)
                                            .font(.system(size: 13, weight: .semibold, design: isClassic ? .serif : .default))
                                            .foregroundColor(.palmText)
                                        Spacer()
                                        if let p = priority {
                                            Text(p)
                                                .font(.system(size: 10, weight: .bold))
                                                .foregroundColor(p == "High" ? .red : (p == "Medium" ? .palmOrange : .palmSecondary))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background((p == "High" ? Color.red : (p == "Medium" ? Color.palmOrange : Color.palmSecondary)).opacity(0.08))
                                                .cornerRadius(isClassic ? 2 : 4)
                                        }
                                    }
                                    if !desc.isEmpty {
                                        Text(desc)
                                            .font(.system(size: 12, design: isClassic ? .serif : .default))
                                            .foregroundColor(.palmSecondary)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                    if let f = freq {
                                        HStack(spacing: 4) {
                                            Image(systemName: "clock").font(.system(size: 10))
                                            Text(f).font(.system(size: 11, weight: .medium))
                                        }
                                        .foregroundColor(accent.opacity(0.8))
                                    }
                                }
                            }
                            .padding(isMinimal ? 8 : 12)
                            .background(isMinimal ? Color.clear : Color(UIColor.tertiarySystemGroupedBackground))
                            .cornerRadius(isClassic ? 4 : 10)

                            if isMinimal {
                                Rectangle().fill(Color.gray.opacity(0.08)).frame(height: 0.5)
                            }
                        }
                    }
                }
                .padding(14)
                .background(isMinimal ? Color.clear : Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(sectionRadius)
                .shadow(color: isMinimal ? .clear : .black.opacity(0.03), radius: 3, y: 1)
                .overlay(
                    RoundedRectangle(cornerRadius: sectionRadius)
                        .stroke(isMinimal ? Color.clear : Color.palmBorder, lineWidth: isMinimal ? 0 : 1)
                )
                .padding(.bottom, 14)
            }
        }
    }

    func contractScheduleSection(_ c: VisitContract) -> some View {
        let accent = currentStyle.accentColor
        let layout = currentStyle.layoutType
        let isClassic = layout == .classic
        let isMinimal = layout == .minimal
        let isElegant = layout == .elegant
        let sectionRadius: CGFloat = isClassic ? 4 : (isMinimal ? 0 : 12)
        let headingFont: Font = isClassic ? .system(size: 15, weight: .bold, design: .serif) : (isElegant ? .system(size: 16, weight: .heavy) : .system(size: 15, weight: .bold))

        return Group {
            if let sched = c.schedule, !sched.isEmpty {
                let freq = (sched["frequency"]?.value as? String) ?? ""
                let serviceHours = sched["service_hours"]?.value as? [[String: Any]]
                let rationale = sched["rationale"]?.value as? String

                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 6) {
                        if !isMinimal {
                            Image(systemName: "calendar.badge.clock")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(accent)
                        }
                        Text("Schedule")
                            .font(headingFont)
                            .foregroundColor(isMinimal ? .palmText.opacity(0.7) : .palmText)
                    }

                    if isMinimal {
                        Rectangle().fill(Color.gray.opacity(0.15)).frame(height: 0.5)
                    }

                    if !freq.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "repeat").font(.system(size: 12)).foregroundColor(accent)
                            Text("Frequency: \(freq)")
                                .font(.system(size: 13, weight: .medium, design: isClassic ? .serif : .default))
                                .foregroundColor(.palmText)
                        }
                    }

                    if let hours = serviceHours, !hours.isEmpty {
                        ForEach(Array(hours.enumerated()), id: \.offset) { _, sh in
                            let svc = sh["service"] as? String ?? "Service"
                            let hrs = sh["hours_per_week"] as? Int ?? (sh["hours_per_week"] as? Double).map { Int($0) } ?? 0
                            let level = sh["need_level"] as? String ?? ""

                            HStack {
                                Text(svc)
                                    .font(.system(size: 12, weight: .medium, design: isClassic ? .serif : .default))
                                    .foregroundColor(.palmText)
                                Spacer()
                                if !level.isEmpty {
                                    Text(level.capitalized)
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundColor(.palmSecondary)
                                }
                                Text("\(hrs) hrs/wk")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(accent)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(isMinimal ? Color.clear : Color(UIColor.tertiarySystemGroupedBackground))
                            .cornerRadius(isClassic ? 4 : 8)
                        }
                    }

                    if let r = rationale, !r.isEmpty {
                        Text(r)
                            .font(.system(size: 12, design: isClassic ? .serif : .default))
                            .foregroundColor(.palmSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 4)
                    }
                }
                .padding(14)
                .background(isMinimal ? Color.clear : Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(sectionRadius)
                .shadow(color: isMinimal ? .clear : .black.opacity(0.03), radius: 3, y: 1)
                .overlay(
                    RoundedRectangle(cornerRadius: sectionRadius)
                        .stroke(isMinimal ? Color.clear : Color.palmBorder, lineWidth: isMinimal ? 0 : 1)
                )
                .padding(.bottom, 14)
            }
        }
    }

    func contractDocumentSection(_ c: VisitContract) -> some View {
        let accent = currentStyle.accentColor
        let layout = currentStyle.layoutType
        let isClassic = layout == .classic
        let isMinimal = layout == .minimal
        let isElegant = layout == .elegant
        let sectionRadius: CGFloat = isClassic ? 4 : (isMinimal ? 0 : 12)
        let headingFont: Font = isClassic ? .system(size: 15, weight: .bold, design: .serif) : (isElegant ? .system(size: 16, weight: .heavy) : .system(size: 15, weight: .bold))

        return Group {
            if let content = c.content, !content.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 6) {
                        if !isMinimal {
                            Image(systemName: "doc.text.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(accent.opacity(0.6))
                        }
                        Text("Full Agreement")
                            .font(headingFont)
                            .foregroundColor(isMinimal ? .palmText.opacity(0.7) : .palmText)
                        Spacer()
                        Button { showFullContract.toggle() } label: {
                            HStack(spacing: 4) {
                                Text(showFullContract ? "Collapse" : "View")
                                    .font(.system(size: 12, weight: .medium))
                                Image(systemName: showFullContract ? "chevron.up" : "chevron.down")
                                    .font(.system(size: 10, weight: .bold))
                            }
                            .foregroundColor(accent)
                        }
                    }

                    if isMinimal {
                        Rectangle().fill(Color.gray.opacity(0.15)).frame(height: 0.5)
                    }

                    if showFullContract {
                        contractFormattedContent(content)
                    } else {
                        let preview = String(content.prefix(200)).trimmingCharacters(in: .whitespacesAndNewlines)
                        Text(preview + "...")
                            .font(.system(size: 12, design: isClassic ? .serif : .default))
                            .foregroundColor(.palmSecondary)
                            .lineLimit(4)
                    }

                    Button { showEmailSheet = true } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Email Full Agreement")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(
                            LinearGradient(colors: currentStyle.previewColors,
                                           startPoint: .leading, endPoint: .trailing)
                        )
                        .cornerRadius(isClassic ? 4 : 12)
                        .shadow(color: accent.opacity(0.3), radius: 6, y: 3)
                    }
                    .padding(.top, 4)
                    .accessibilityLabel("Email the full service agreement")
                }
                .padding(14)
                .background(isMinimal ? Color.clear : Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(sectionRadius)
                .shadow(color: isMinimal ? .clear : .black.opacity(0.03), radius: 3, y: 1)
                .overlay(
                    RoundedRectangle(cornerRadius: sectionRadius)
                        .stroke(isMinimal ? Color.clear : Color.palmBorder, lineWidth: isMinimal ? 0 : 1)
                )
            }
        }
    }

    func contractFormattedContent(_ content: String) -> some View {
        let accent = currentStyle.accentColor
        let layout = currentStyle.layoutType
        let isClassic = layout == .classic
        let isElegant = layout == .elegant
        let sections = parseContractSections(content)

        return VStack(alignment: .leading, spacing: 16) {
            ForEach(Array(sections.enumerated()), id: \.offset) { _, section in
                VStack(alignment: .leading, spacing: 6) {
                    if !section.heading.isEmpty {
                        if isElegant {
                            Text(section.heading)
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundColor(accent)
                                .padding(.bottom, 2)
                            Rectangle()
                                .fill(LinearGradient(colors: currentStyle.previewColors, startPoint: .leading, endPoint: .trailing))
                                .frame(height: 1.5)
                                .frame(maxWidth: 80)
                        } else {
                            Text(section.heading)
                                .font(.system(size: 14, weight: .bold, design: isClassic ? .serif : .default))
                                .foregroundColor(accent)
                                .padding(.bottom, 2)
                            Divider()
                        }
                    }
                    Text(section.body)
                        .font(.system(size: 12, design: isClassic ? .serif : .default))
                        .foregroundColor(.palmText)
                        .fixedSize(horizontal: false, vertical: true)
                        .lineSpacing(isClassic ? 4 : 3)
                }
            }
        }
    }

    func serviceIcon(for name: String) -> String {
        let lower = name.lowercased()
        if lower.contains("personal") || lower.contains("adl") { return "figure.stand" }
        if lower.contains("meal") || lower.contains("nutrition") { return "fork.knife" }
        if lower.contains("house") || lower.contains("cleaning") { return "house.fill" }
        if lower.contains("companion") { return "person.2.fill" }
        if lower.contains("respite") { return "heart.fill" }
        if lower.contains("transport") { return "car.fill" }
        if lower.contains("medic") { return "pills.fill" }
        if lower.contains("safety") { return "shield.checkered" }
        if lower.contains("mobility") { return "figure.walk" }
        return "cross.case.fill"
    }

    struct ContractSection {
        let heading: String
        let body: String
    }

    func parseContractSections(_ content: String) -> [ContractSection] {
        let lines = content.components(separatedBy: "\n")
        var sections: [ContractSection] = []
        var currentHeading = ""
        var currentBody: [String] = []

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix("====") || trimmed.hasPrefix("----") { continue }
            let isSectionHeader = !trimmed.isEmpty &&
                (trimmed == trimmed.uppercased() && trimmed.count > 3 && trimmed.rangeOfCharacter(from: .letters) != nil) ||
                trimmed.range(of: #"^\d+\.\s+[A-Z]"#, options: .regularExpression) != nil

            if isSectionHeader {
                if !currentHeading.isEmpty || !currentBody.isEmpty {
                    let bodyText = currentBody.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                    if !bodyText.isEmpty || !currentHeading.isEmpty {
                        sections.append(ContractSection(heading: currentHeading, body: bodyText))
                    }
                }
                currentHeading = trimmed.replacingOccurrences(of: #"^\d+\.\s+"#, with: "", options: .regularExpression)
                    .capitalized
                currentBody = []
            } else {
                currentBody.append(line)
            }
        }
        if !currentHeading.isEmpty || !currentBody.isEmpty {
            let bodyText = currentBody.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            if !bodyText.isEmpty { sections.append(ContractSection(heading: currentHeading, body: bodyText)) }
        }
        return sections
    }

    func miniStat(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.palmSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
    }

    // MARK: - Shared Components

}
