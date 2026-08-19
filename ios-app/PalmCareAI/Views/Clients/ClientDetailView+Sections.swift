import SwiftUI

extension ClientDetailView {
    // MARK: - Hero Card

    var heroCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 14) {
                ClientAvatar(name: client.full_name, size: 64)

                VStack(alignment: .leading, spacing: 5) {
                    Text(client.full_name)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.palmInk)
                        .tracking(-0.66)
                        .fixedSize(horizontal: false, vertical: true)

                    if let preferred = cleaned(client.preferred_name) {
                        Text("\"\(preferred)\"")
                            .font(.system(size: 13))
                            .foregroundColor(.palmGlassMuted)
                    }

                    if let diagnosis = cleaned(client.primary_diagnosis) {
                        Text(humanized(diagnosis))
                            .font(.system(size: 14))
                            .foregroundColor(.palmGlassMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                Spacer(minLength: 0)
            }

            if statusLabel != nil || careLevelLabel != nil || cleaned(client.date_of_birth) != nil {
                HStack(spacing: 8) {
                    if let status = statusLabel {
                        HStack(spacing: 6) {
                            Circle().fill(statusColor).frame(width: 6, height: 6)
                            Text(status)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(statusColor)
                        }
                        .padding(.horizontal, 11)
                        .frame(height: 26)
                        .background(Capsule(style: .continuous).fill(statusColor.opacity(0.12)))
                    }

                    if let care = careLevelLabel {
                        Text(care)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(careLevelColor)
                            .padding(.horizontal, 11)
                            .frame(height: 26)
                            .background(Capsule(style: .continuous).fill(careLevelColor.opacity(0.12)))
                    }

                    if let dob = cleaned(client.date_of_birth) {
                        Text("Born \(dob.palmFormattedDateOnly)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Color(red: 71 / 255, green: 85 / 255, blue: 105 / 255))
                            .padding(.horizontal, 11)
                            .frame(height: 26)
                            .background(Capsule(style: .continuous).fill(Color(red: 241 / 255, green: 245 / 255, blue: 249 / 255)))
                    }
                }
            }

            if cleaned(client.phone) != nil || cleaned(client.email) != nil {
                HStack(spacing: 10) {
                    if let phone = cleaned(client.phone) {
                        heroAction(icon: "phone.fill", label: "Call", filled: true) {
                            let dialable = phone.filter { $0.isNumber || $0 == "+" }
                            if !dialable.isEmpty, let url = URL(string: "tel:\(dialable)") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                    if let email = cleaned(client.email) {
                        heroAction(icon: "envelope.fill", label: "Email", filled: false) {
                            if let url = URL(string: "mailto:\(email)") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .palmGlassCard(radius: 28, fillOpacity: 0.58)
    }

    /// Care-level pill color, matching the Clients list (High → danger,
    /// Moderate → warning, Low → success).
    var careLevelColor: Color {
        switch (client.care_level ?? "").uppercased() {
        case "HIGH": return Color(red: 220 / 255, green: 38 / 255, blue: 38 / 255)
        case "MODERATE", "MEDIUM": return .palmOrange
        case "LOW": return .palmGreen
        default: return statusColor
        }
    }

    /// Paper hero action: filled teal "Call", glass "Email". Both 46pt tall.
    func heroAction(icon: String, label: String, filled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                Text(label)
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundColor(filled ? .white : .palmTeal600)
            .frame(maxWidth: .infinity)
            .frame(height: 46)
            .background(
                Group {
                    if filled {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color.palmPrimary)
                            .shadow(color: Color.palmPrimary.opacity(0.25), radius: 9, y: 8)
                    } else {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color.white.opacity(0.74))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(Color.white.opacity(0.92), lineWidth: 1)
                            )
                    }
                }
            )
        }
        .accessibilityLabel(label)
    }

    // MARK: - Contact

    var contactSection: some View {
        DetailSection(title: "Contact") {
            VStack(spacing: 0) {
                var showDivider = false

                if let phone = cleaned(client.phone) {
                    factRow(label: "Phone", value: phone.palmFormattedPhone)
                    let _ = (showDivider = true)
                }
                if let phone2 = cleaned(client.phone_secondary) {
                    if showDivider { detailDivider }
                    factRow(label: "Secondary Phone", value: phone2.palmFormattedPhone)
                    let _ = (showDivider = true)
                }
                if let email = cleaned(client.email) {
                    if showDivider { detailDivider }
                    factRow(label: "Email", value: email)
                    let _ = (showDivider = true)
                }
                let address = [client.address, client.city, client.state, client.zip_code]
                    .compactMap { cleaned($0) }
                    .joined(separator: ", ")
                if !address.isEmpty {
                    if showDivider { detailDivider }
                    factRow(label: "Address", value: address)
                }
            }
        }
    }

    // MARK: - Emergency

    var emergencySection: some View {
        DetailSection(title: "Emergency") {
            let primaryName = cleaned(client.emergency_contact_name)
            let usePrimary = primaryName != nil
            let name = usePrimary ? primaryName! : (cleaned(client.emergency_contact_2_name) ?? "")
            let relationship = usePrimary
                ? cleaned(client.emergency_contact_relationship)
                : cleaned(client.emergency_contact_2_relationship)
            let phone = usePrimary
                ? cleaned(client.emergency_contact_phone)
                : cleaned(client.emergency_contact_2_phone)

            let subParts = [relationship, phone?.palmFormattedPhone].compactMap { $0 }

            VStack(alignment: .leading, spacing: 4) {
                Text(name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmInk)
                    .fixedSize(horizontal: false, vertical: true)
                if !subParts.isEmpty {
                    Text(subParts.joined(separator: " · "))
                        .font(.system(size: 12))
                        .foregroundColor(.palmHint)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
        }
    }

    // MARK: - Medical (short fact rows only — never the raw transcript)

    var medicalSection: some View {
        DetailSection(title: "Medical") {
            VStack(spacing: 0) {
                if let diagnosis = cleaned(client.primary_diagnosis) {
                    factRow(label: "Primary Diagnosis", value: humanized(diagnosis))
                    detailDivider
                }
                if let allergies = cleaned(client.allergies) {
                    factRow(label: "Allergies", value: allergies)
                    detailDivider
                }
                if let meds = cleaned(client.medications) {
                    factRow(label: "Medications", value: meds)
                    detailDivider
                }
                if let mobility = cleaned(client.mobility_status) {
                    factRow(label: "Mobility", value: humanized(mobility))
                    detailDivider
                }
                if let cognitive = cleaned(client.cognitive_status) {
                    factRow(label: "Cognitive", value: humanized(cognitive))
                    detailDivider
                } else {
                    emptyFactRow(label: "Cognitive")
                    detailDivider
                }
                if let physician = cleaned(client.physician_name) {
                    let detail = [physician, cleaned(client.physician_phone)?.palmFormattedPhone]
                        .compactMap { $0 }
                        .joined(separator: " · ")
                    factRow(label: "Physician", value: detail)
                } else {
                    emptyFactRow(label: "Physician")
                }
            }
        }
    }

    // MARK: - Latest Assessment (optional, summarized)

    @ViewBuilder
    var latestAssessmentSection: some View {
        if let block = latestAssessment(), let summary = assessmentSummary(block) {
            DetailSection(title: "Latest Assessment") {
                VStack(alignment: .leading, spacing: 12) {
                    if let date = block.date {
                        datePill(date)
                    }

                    Text(summary)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.palmText.opacity(0.88))
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)

                    if let visit = latestAssessmentVisit {
                        NavigationLink(destination:
                            VisitDetailView(visitId: visit.id, clientName: client.full_name)
                                .environmentObject(api)
                        ) {
                            HStack(spacing: 6) {
                                Text("Open visit")
                                    .font(.system(size: 13, weight: .semibold))
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            .foregroundColor(.palmPrimary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Open visit for latest assessment")
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
            }
        }
    }

    // MARK: - Care

    var careSection: some View {
        DetailSection(title: "Care") {
            VStack(spacing: 0) {
                if let care = careLevelLabel {
                    factRow(label: "Care Level", value: care)
                    detailDivider
                }
                if let living = cleaned(client.living_situation) {
                    factRow(label: "Living Situation", value: humanized(living))
                    detailDivider
                } else {
                    emptyFactRow(label: "Living Situation")
                    detailDivider
                }
                if let plan = cleaned(client.care_plan) {
                    let goals = carePlanGoals(plan)
                    if !goals.isEmpty {
                        Button { showEditSheet = true } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("CARE PLAN")
                                    .font(.system(size: 10, weight: .bold))
                                    .tracking(0.6)
                                    .foregroundColor(.palmSecondary)
                                ForEach(Array(goals.enumerated()), id: \.offset) { _, goal in
                                    HStack(alignment: .top, spacing: 8) {
                                        Circle()
                                            .fill(Color.palmPrimary)
                                            .frame(width: 5, height: 5)
                                            .padding(.top, 6)
                                        Text(goal)
                                            .font(.system(size: 14, weight: .medium))
                                            .foregroundColor(.palmText)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Edit care plan")
                    } else {
                        factRow(label: "Care Plan", value: truncated(plan))
                    }
                } else {
                    emptyFactRow(label: "Care Plan")
                }
            }
        }
    }

    var insuranceSection: some View {
        DetailSection(title: "Insurance") {
            VStack(spacing: 0) {
                if let provider = cleaned(client.insurance_provider) {
                    let detail = [provider, cleaned(client.insurance_id).map { "#\($0)" }]
                        .compactMap { $0 }
                        .joined(separator: " · ")
                    factRow(label: "Insurance", value: detail)
                } else {
                    emptyFactRow(label: "Insurance")
                }
                if let medicaid = cleaned(client.medicaid_id) {
                    detailDivider
                    factRow(label: "Medicaid ID", value: medicaid)
                }
                if let medicare = cleaned(client.medicare_id) {
                    detailDivider
                    factRow(label: "Medicare ID", value: medicare)
                }
                if let billing = cleaned(client.billing_address) {
                    detailDivider
                    factRow(label: "Billing Address", value: billing)
                }
            }
        }
    }

    var schedulingSection: some View {
        DetailSection(title: "Scheduling") {
            VStack(spacing: 0) {
                if let days = cleaned(client.preferred_days) {
                    factRow(label: "Preferred Days", value: days)
                } else {
                    emptyFactRow(label: "Preferred Days")
                }
                if let times = cleaned(client.preferred_times) {
                    detailDivider
                    factRow(label: "Preferred Times", value: times)
                } else {
                    detailDivider
                    emptyFactRow(label: "Preferred Times")
                }
                if let intake = cleaned(client.intake_date) {
                    detailDivider
                    factRow(label: "Intake Date", value: intake.palmFormattedDateOnly)
                }
                if let discharge = cleaned(client.discharge_date) {
                    detailDivider
                    factRow(label: "Discharge Date", value: discharge.palmFormattedDateOnly)
                }
                if let extId = cleaned(client.external_id) {
                    detailDivider
                    let detail = [extId, cleaned(client.external_source)]
                        .compactMap { $0 }
                        .joined(separator: " · ")
                    factRow(label: "External ID", value: detail)
                }
            }
        }
    }

    // MARK: - Notes

    var notesSection: some View {
        DetailSection(title: "Notes") {
            if let notes = cleaned(client.notes) {
                Button { showEditSheet = true } label: {
                    Text(notes)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.palmText)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Edit notes")
            }
        }
    }

    // MARK: - Visits

    var visitsSection: some View {
        DetailSection(title: "Visits (\(clientVisits.count))") {
            if isLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .padding(.vertical, 20)
            } else if loadError != nil {
                visitsErrorView
            } else if clientVisitsNewestFirst.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 26))
                        .foregroundColor(.palmSecondary.opacity(0.35))
                    Text("No visits yet")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(clientVisitsNewestFirst.enumerated()), id: \.element.id) { index, visit in
                        NavigationLink(destination:
                            VisitDetailView(
                                visitId: visit.id,
                                clientName: client.full_name
                            ).environmentObject(api)
                        ) {
                            visitRow(visit)
                        }
                        .accessibilityLabel("\(client.full_name), Assessment \(formattedDate(visit.created_at))")
                        .buttonStyle(.plain)
                        if index < clientVisitsNewestFirst.count - 1 {
                            detailDivider
                        }
                    }
                }
            }
        }
    }
}
