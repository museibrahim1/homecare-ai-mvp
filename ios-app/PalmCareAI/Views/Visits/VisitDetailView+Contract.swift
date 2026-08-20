import SwiftUI

extension VisitDetailView {
    var currentStyle: ContractStyle {
        builtInContractStyles.first { $0.id == selectedContractStyle } ?? builtInContractStyles[1]
    }

    // MARK: - Contract Tab (Paper Pipeline Glass → Contract 3GX-0)

    var contractTab: some View {
        VStack(spacing: 0) {
            if let c = contract {
                VStack(spacing: 0) {
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 0) {
                            contractCardHeader(c)

                            if isEditingContract {
                                contractEditForm(c)
                                    .padding(.top, 14)
                            } else {
                                contractReadingBody(c)
                                    .padding(.top, 14)
                            }
                        }
                        .padding(.horizontal, 18)
                        .padding(.top, 18)
                        .padding(.bottom, 14)
                    }

                    Button { showEmailSheet = true } label: {
                        Text("Send agreement")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(
                                Capsule(style: .continuous)
                                    .fill(Color.palmPrimary)
                            )
                            .shadow(color: PalmGlass.tealShadow, radius: 14, y: 8)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                    .accessibilityLabel("Send agreement")
                }
                .palmGlassCard(radius: 28, fillOpacity: 0.96)
            } else if tabFetchFailed.contains("contract") {
                tabErrorState(tab: "contract")
            } else {
                documentEmptyState(
                    step: "contract",
                    icon: "doc.text.fill",
                    title: "No Contract",
                    waitingMessage: "The contract will appear here once the assessment has been fully processed."
                )
            }
        }
    }

    // MARK: - Card header (eyebrow + serif title + discreet menu)

    private func contractCardHeader(_ c: VisitContract) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                contractSectionLabel(contractEyebrowText)
                Spacer(minLength: 8)
                if !isEditingContract {
                    contractHeaderMenu(c)
                }
            }

            if isEditingContract {
                TextField("Agreement title", text: $editContractTitle)
                    .font(.system(size: 22, weight: .semibold, design: .serif))
                    .foregroundColor(.palmText)
            } else {
                Text(contractDisplayTitle(c))
                    .font(.system(size: 22, weight: .semibold, design: .serif))
                    .foregroundColor(.palmText)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if !isEditingContract {
                Text(contractEffectiveLine(c))
                    .font(.system(size: 13))
                    .foregroundColor(.palmSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                if let status = c.status {
                    PalmStatusChip(text: status.capitalized, tone: status == "active" ? .success : .warning)
                        .padding(.top, 2)
                }
            }
        }
    }

    private func contractHeaderMenu(_ c: VisitContract) -> some View {
        Menu {
            Button { beginContractEdit(c) } label: {
                Label("Edit Agreement", systemImage: "pencil")
            }
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
            Image(systemName: "ellipsis")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmPrimary)
                .frame(width: 32, height: 32)
                .background(Circle().fill(Color.palmPrimary.opacity(0.08)))
        }
        .accessibilityLabel("Agreement options")
    }

    // MARK: - Reading body (Paper: PARTIES, numbered sections, SIGNATURES)

    private func contractReadingBody(_ c: VisitContract) -> some View {
        VStack(alignment: .leading, spacing: 22) {
            contractPartiesSection(c)

            ForEach(Array(contractSections(c).enumerated()), id: \.offset) { _, section in
                VStack(alignment: .leading, spacing: 8) {
                    contractSectionLabel(section.label)
                    Text(section.body)
                        .font(.system(size: 13))
                        .foregroundColor(.palmText)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            contractSignaturesSection
        }
    }

    private func contractPartiesSection(_ c: VisitContract) -> some View {
        let provider = contractProvider(c)
        return VStack(alignment: .leading, spacing: 14) {
            contractSectionLabel("Parties")

            contractPartyBlock(
                role: "Provider",
                name: provider.name,
                lines: [provider.address, provider.phone, provider.license].compactMap { $0 }
            )

            Rectangle()
                .fill(Color.palmText.opacity(0.08))
                .frame(height: 1)

            contractPartyBlock(
                role: "Client",
                name: contractClientName,
                lines: contractClientLines
            )
        }
    }

    private func contractPartyBlock(role: String, name: String, lines: [String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(role.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(0.6)
                .foregroundColor(.palmSecondary)
            Text(name)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmText)
                .fixedSize(horizontal: false, vertical: true)
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                Text(line)
                    .font(.system(size: 13))
                    .foregroundColor(.palmSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var contractSignaturesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            contractSectionLabel("Signatures")

            Text("By signing below, both parties agree to the services, schedule, rates, and terms described in this agreement.")
                .font(.system(size: 13))
                .foregroundColor(.palmText)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            contractSignatureLine(
                label: "Client or authorized representative",
                hint: "Signature and date"
            )
            contractSignatureLine(
                label: "Agency representative",
                hint: "Signature, printed name, and title"
            )
        }
    }

    private func contractSignatureLine(label: String, hint: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Rectangle()
                .fill(Color.palmText.opacity(0.28))
                .frame(height: 1)
                .padding(.top, 18)
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)
            Text(hint)
                .font(.system(size: 11))
                .foregroundColor(.palmSecondary)
        }
    }

    // MARK: - Edit form (preserves existing edit/save)

    private func contractEditForm(_ c: VisitContract) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Hourly rate")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.palmSecondary)
                TextField("28", text: $editContractRate)
                    .keyboardType(.decimalPad)
                    .font(.system(size: 13, weight: .semibold))
                    .padding(8)
                    .background(Color.white.opacity(0.75))
                    .cornerRadius(8)
                Text("Weekly hours")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.palmSecondary)
                TextField("12", text: $editContractHours)
                    .keyboardType(.decimalPad)
                    .font(.system(size: 13, weight: .semibold))
                    .padding(8)
                    .background(Color.white.opacity(0.75))
                    .cornerRadius(8)
            }

            Text("Terms")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.palmSecondary)
            TextField("Terms and conditions", text: $editContractTerms, axis: .vertical)
                .font(.system(size: 13))
                .lineLimit(4...12)
                .padding(10)
                .background(Color.white.opacity(0.75))
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmGlassBorder, lineWidth: 1))

            HStack(spacing: 10) {
                Button {
                    Task { await saveContractEdits() }
                } label: {
                    HStack(spacing: 6) {
                        if isSavingContract { ProgressView().scaleEffect(0.6).tint(.palmPrimary) }
                        Text("Save changes").font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundColor(.palmPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.palmPrimary.opacity(0.1))
                    .cornerRadius(10)
                }
                .disabled(isSavingContract)

                Button("Cancel") { isEditingContract = false }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmSecondary)

                Spacer()
            }
            .padding(.top, 2)
        }
    }

    // MARK: - Derived content

    private func contractDisplayTitle(_ c: VisitContract) -> String {
        let title = (c.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        // Prefer the Paper serif title; only keep a bespoke title if the agency
        // renamed it to something other than the generic default.
        if title.isEmpty || title.lowercased().contains("service agreement") {
            return "Home Care Service Agreement"
        }
        return title
    }

    var contractEyebrowText: String {
        if let state = contractStateName {
            return "\(state) · Private Pay"
        }
        return "Private Pay"
    }

    /// Full uppercase state name from the client's two-letter code (e.g. "FL" → "FLORIDA").
    var contractStateName: String? {
        let raw = (visit?.client?.state ?? "").trimmingCharacters(in: .whitespaces)
        guard !raw.isEmpty else { return nil }
        if raw.count == 2, let name = Self.usStateNames[raw.uppercased()] {
            return name.uppercased()
        }
        return raw.uppercased()
    }

    var contractClientName: String {
        visit?.client?.full_name ?? clientName ?? "Client"
    }

    /// Client address + emergency contact lines for the PARTIES block.
    var contractClientLines: [String] {
        var lines: [String] = []
        if let client = visit?.client {
            let cityLine = [client.city, client.state, client.zip_code]
                .compactMap { $0?.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
                .joined(separator: ", ")
            let address = [client.address?.trimmingCharacters(in: .whitespaces), cityLine.isEmpty ? nil : cityLine]
                .compactMap { $0 }
                .filter { !$0.isEmpty }
                .joined(separator: ", ")
            if !address.isEmpty { lines.append(address) }
            if let phone = client.phone, !phone.isEmpty {
                lines.append(phone.palmFormattedPhone)
            }
            if let ec = client.emergency_contact_name, !ec.isEmpty {
                var emergency = "Emergency: \(ec)"
                if let ecPhone = client.emergency_contact_phone, !ecPhone.isEmpty {
                    emergency += " · \(ecPhone.palmFormattedPhone)"
                }
                lines.append(emergency)
            }
        }
        return lines
    }

    private func contractEffectiveLine(_ c: VisitContract) -> String {
        let date = contractEffectiveDate(c)
        let provider = contractProvider(c)
        let agency = provider.name.trimmingCharacters(in: .whitespaces)
        if !agency.isEmpty, agency.lowercased() != "home care services agency" {
            return "Effective \(date). \(agency) and \(contractClientName)."
        }
        return "Effective \(date). Prepared for \(contractClientName)."
    }

    private func contractEffectiveDate(_ c: VisitContract) -> String {
        // Prefer the contract's own start date, then the effective line inside
        // the generated body, then the created timestamp, then today.
        if let start = c.start_date, let formatted = formatContractDate(start) {
            return formatted
        }
        if let content = c.content,
           let range = content.range(of: "entered into on ") {
            let after = content[range.upperBound...]
            let line = after.prefix(while: { $0 != "\n" }).trimmingCharacters(in: .whitespaces)
            if !line.isEmpty { return line }
        }
        if let created = c.created_at, let formatted = formatContractDate(created) {
            return formatted
        }
        return Date().formatted(.dateTime.month(.wide).day().year())
    }

    private func formatContractDate(_ raw: String) -> String? {
        let dayOnly = DateFormatter()
        dayOnly.dateFormat = "yyyy-MM-dd"
        dayOnly.locale = Locale(identifier: "en_US_POSIX")
        if let d = dayOnly.date(from: String(raw.prefix(10))) {
            return d.formatted(.dateTime.month(.wide).day().year())
        }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: raw) {
            return d.formatted(.dateTime.month(.wide).day().year())
        }
        iso.formatOptions = [.withInternetDateTime]
        if let d = iso.date(from: raw) {
            return d.formatted(.dateTime.month(.wide).day().year())
        }
        return nil
    }

    struct ContractProvider {
        let name: String
        let address: String?
        let phone: String?
        let license: String?
    }

    /// Parses the Provider block from the generated agreement text. Falls back
    /// to a neutral label when the body has no structured provider info.
    func contractProvider(_ c: VisitContract) -> ContractProvider {
        var name: String?
        var address: String?
        var phone: String?
        var license: String?

        if let content = c.content {
            var inProvider = false
            for rawLine in content.components(separatedBy: "\n") {
                let line = rawLine.trimmingCharacters(in: .whitespaces)
                if line.hasPrefix("Service Provider:") {
                    name = String(line.dropFirst("Service Provider:".count)).trimmingCharacters(in: .whitespaces)
                    inProvider = true
                    continue
                }
                if line == "AND" || line.hasPrefix("Client:") { inProvider = false }
                guard inProvider else { continue }
                if line.hasPrefix("Address:") {
                    let v = String(line.dropFirst("Address:".count)).trimmingCharacters(in: .whitespaces)
                    if !v.isEmpty { address = v }
                } else if line.hasPrefix("Phone:") {
                    let v = String(line.dropFirst("Phone:".count)).trimmingCharacters(in: .whitespaces)
                    if !v.isEmpty { phone = v }
                } else if line.hasPrefix("License") {
                    license = line
                }
            }
        }

        return ContractProvider(
            name: (name?.isEmpty == false ? name! : "Home care agency"),
            address: address,
            phone: phone.map { "Phone: \($0)" },
            license: license
        )
    }

    struct ContractReadingSection {
        let label: String
        let body: String
    }

    /// Numbered sections from the agreement body (SERVICES, SCHEDULE, RATES,
    /// CANCELLATION, …). Falls back to synthesized sections from the structured
    /// services / schedule / rate fields when the body isn't parseable.
    func contractSections(_ c: VisitContract) -> [ContractReadingSection] {
        if let content = c.content, !content.isEmpty {
            let parsed = parseNumberedSections(content)
            if !parsed.isEmpty { return parsed }
        }
        return fallbackContractSections(c)
    }

    private func parseNumberedSections(_ content: String) -> [ContractReadingSection] {
        var sections: [ContractReadingSection] = []
        var currentLabel: String?
        var body: [String] = []

        func flush() {
            guard let label = currentLabel else { return }
            let text = body.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            if !text.isEmpty {
                sections.append(ContractReadingSection(label: label, body: text))
            }
        }

        for rawLine in content.components(separatedBy: "\n") {
            let line = rawLine.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("====") || line.hasPrefix("----") { continue }
            // Match "1. SERVICES TO BE PROVIDED" or "1A. SERVICES NOT INCLUDED".
            if line.range(of: #"^\d+[A-Z]?\.\s+[A-Z]"#, options: .regularExpression) != nil {
                flush()
                currentLabel = line
                    .replacingOccurrences(of: #"^\d+[A-Z]?\.\s+"#, with: "", options: .regularExpression)
                    .capitalized
                body = []
            } else if currentLabel != nil {
                body.append(rawLine)
            }
        }
        flush()
        return sections
    }

    private func fallbackContractSections(_ c: VisitContract) -> [ContractReadingSection] {
        var out: [ContractReadingSection] = []

        // Services
        if let services = c.services, !services.isEmpty {
            let lines = services.compactMap { item -> String? in
                guard let dict = item.value as? [String: Any] else { return nil }
                let name = dict["name"] as? String ?? dict["service"] as? String ?? "Service"
                let freq = (dict["frequency"] as? String).map { " — \($0)" } ?? ""
                let desc = (dict["description"] as? String).map { ": \($0)" } ?? ""
                return "• \(name)\(desc)\(freq)"
            }
            if !lines.isEmpty {
                out.append(ContractReadingSection(label: "Services", body: lines.joined(separator: "\n")))
            }
        }

        // Schedule
        if let sched = c.schedule, !sched.isEmpty {
            var lines: [String] = []
            if let freq = sched["frequency"]?.value as? String, !freq.isEmpty {
                lines.append("Frequency: \(freq)")
            }
            if let hours = c.weekly_hours {
                lines.append("Hours per week: \(String(format: "%.0f", hours))")
            }
            if let hoursList = sched["service_hours"]?.value as? [[String: Any]] {
                for sh in hoursList {
                    let svc = sh["service"] as? String ?? "Service"
                    let hrs = sh["hours_per_week"] as? Int ?? (sh["hours_per_week"] as? Double).map { Int($0) } ?? 0
                    lines.append("• \(svc): \(hrs) hrs/wk")
                }
            }
            if !lines.isEmpty {
                out.append(ContractReadingSection(label: "Schedule", body: lines.joined(separator: "\n")))
            }
        }

        // Rates
        var rateLines: [String] = []
        if let rate = c.hourly_rate {
            rateLines.append("Hourly rate: $\(String(format: "%.2f", rate))")
        }
        if let rate = c.hourly_rate, let hours = c.weekly_hours {
            rateLines.append("Estimated weekly cost: $\(String(format: "%.2f", rate * hours))")
            rateLines.append("Estimated monthly cost: $\(String(format: "%.2f", rate * hours * 4.33))")
        }
        if !rateLines.isEmpty {
            out.append(ContractReadingSection(label: "Rates", body: rateLines.joined(separator: "\n")))
        }

        // Cancellation
        if let policy = c.cancellation_policy?.trimmingCharacters(in: .whitespacesAndNewlines), !policy.isEmpty {
            out.append(ContractReadingSection(label: "Cancellation", body: policy))
        }

        // Terms (only if we have no structured sections at all, keep body useful)
        if out.isEmpty, let terms = (c.terms_and_conditions ?? c.content)?.trimmingCharacters(in: .whitespacesAndNewlines), !terms.isEmpty {
            out.append(ContractReadingSection(label: "Terms", body: terms))
        }

        return out
    }

    // MARK: - Shared bits

    /// Teal section eyebrow matching Paper (#0D9488, 11px, tracking ~0.08em).
    private func contractSectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .tracking(0.88)
            .foregroundColor(.palmPrimary)
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

    func beginContractEdit(_ c: VisitContract) {
        editContractTitle = c.title ?? ""
        editContractTerms = c.terms_and_conditions ?? c.content ?? ""
        editContractRate = c.hourly_rate.map { String(Int($0)) } ?? ""
        editContractHours = c.weekly_hours.map { String(Int($0)) } ?? ""
        isEditingContract = true
    }

    func saveContractEdits() async {
        guard !isSavingContract else { return }
        await MainActor.run { isSavingContract = true }
        defer { Task { @MainActor in isSavingContract = false } }
        do {
            let updated = try await api.updateVisitContract(
                visitId: visitId,
                title: editContractTitle,
                termsAndConditions: editContractTerms,
                hourlyRate: Double(editContractRate),
                weeklyHours: Double(editContractHours)
            )
            await MainActor.run {
                contract = updated
                isEditingContract = false
            }
            PostHogService.shared.capture("contract_edited")
        } catch {
            await MainActor.run {
                actionError = "Could not save contract: \(error.palmFriendlyMessage)"
                showActionError = true
            }
        }
    }

    static let usStateNames: [String: String] = [
        "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
        "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
        "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
        "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
        "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
        "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
        "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
        "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
        "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
        "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
        "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
        "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
        "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia"
    ]
}
