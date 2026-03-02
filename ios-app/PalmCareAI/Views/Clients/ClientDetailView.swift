import SwiftUI

struct ClientDetailView: View {
    @EnvironmentObject var api: APIService
    let client: Client

    @State private var visits: [Visit] = []
    @State private var isLoading = true
    @State private var showEditSheet = false

    private static let avatarColors: [Color] = [
        Color(red: 13/255, green: 148/255, blue: 136/255),
        Color(red: 59/255, green: 130/255, blue: 246/255),
        Color(red: 220/255, green: 38/255, blue: 38/255),
        Color(red: 124/255, green: 58/255, blue: 237/255),
        Color(red: 217/255, green: 119/255, blue: 6/255),
        Color(red: 8/255, green: 145/255, blue: 178/255),
    ]

    private var initials: String {
        client.full_name.split(separator: " ").map { String($0.prefix(1)) }.joined().uppercased()
    }

    private var avatarColor: Color {
        Self.avatarColors[abs(client.full_name.hashValue) % Self.avatarColors.count]
    }

    private var clientVisits: [Visit] {
        visits.filter { $0.client_id == client.id }
    }

    private var statusColor: Color {
        switch client.displayStatus.lowercased() {
        case "active": return .palmGreen
        case "inactive": return .palmOrange
        case "discharged": return .palmSecondary
        case "pending": return .palmBlue
        default: return .palmSecondary
        }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                profileCard

                if hasContactInfo { contactSection }
                if hasEmergencyInfo { emergencySection }
                if hasMedicalInfo { medicalSection }
                if hasCareInfo { careSection }
                if hasInsuranceInfo { insuranceSection }
                if hasSchedulingInfo { schedulingSection }
                if hasNotes { notesSection }

                visitsSection
            }
            .padding(.horizontal, 18)
            .padding(.top, 10)
            .padding(.bottom, 120)
        }
        .background(Color.palmBackground)
        .navigationTitle(client.full_name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showEditSheet = true
                } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.palmPrimary)
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            AddClientSheet(editingClient: client)
                .environmentObject(api)
        }
        .task { await loadVisits() }
    }

    // MARK: - Section Checks

    private var hasContactInfo: Bool {
        [client.phone, client.phone_secondary, client.email, client.address]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    private var hasEmergencyInfo: Bool {
        [client.emergency_contact_name, client.emergency_contact_2_name]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    private var hasMedicalInfo: Bool {
        [client.primary_diagnosis, client.secondary_diagnoses, client.medications,
         client.allergies, client.physician_name, client.mobility_status, client.cognitive_status, client.medical_notes]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    private var hasCareInfo: Bool {
        [client.care_level, client.living_situation, client.care_plan, client.special_requirements]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    private var hasInsuranceInfo: Bool {
        [client.insurance_provider, client.insurance_id, client.medicaid_id, client.medicare_id, client.billing_address]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    private var hasSchedulingInfo: Bool {
        [client.preferred_days, client.preferred_times, client.intake_date, client.discharge_date,
         client.external_id, client.external_source]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    private var hasNotes: Bool {
        if let n = client.notes, !n.isEmpty { return true }
        return false
    }

    // MARK: - Profile Card

    private var profileCard: some View {
        VStack(spacing: 16) {
            Circle()
                .fill(avatarColor)
                .frame(width: 68, height: 68)
                .overlay(
                    Text(initials)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                )
                .shadow(color: avatarColor.opacity(0.3), radius: 8, y: 4)

            VStack(spacing: 6) {
                Text(client.full_name)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.palmText)

                if let preferred = client.preferred_name, !preferred.isEmpty {
                    Text(""\(preferred)"")
                        .font(.system(size: 13))
                        .foregroundColor(.palmSecondary)
                }

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    Text(diagnosis)
                        .font(.system(size: 13))
                        .foregroundColor(.palmSecondary)
                        .multilineTextAlignment(.center)
                }
            }

            HStack(spacing: 10) {
                HStack(spacing: 5) {
                    Circle().fill(statusColor).frame(width: 7, height: 7)
                    Text(client.displayStatus.capitalized)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(statusColor)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 5)
                .background(statusColor.opacity(0.1))
                .cornerRadius(14)

                if let careLevel = client.care_level, !careLevel.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.palmPink)
                        Text(careLevel)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.palmPink)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 5)
                    .background(Color.palmPink.opacity(0.08))
                    .cornerRadius(14)
                }

                if let dob = client.date_of_birth, !dob.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "birthday.cake")
                            .font(.system(size: 10))
                            .foregroundColor(.palmPurple)
                        Text(dob)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.palmPurple)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 5)
                    .background(Color.palmPurple.opacity(0.08))
                    .cornerRadius(14)
                }
            }

            if let phone = client.phone, !phone.isEmpty {
                HStack(spacing: 16) {
                    actionButton(icon: "phone.fill", label: "Call", color: .palmGreen) {
                        if let url = URL(string: "tel:\(phone)") {
                            UIApplication.shared.open(url)
                        }
                    }
                    if let email = client.email, !email.isEmpty {
                        actionButton(icon: "envelope.fill", label: "Email", color: .palmBlue) {
                            if let url = URL(string: "mailto:\(email)") {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 22)
        .padding(.horizontal, 16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 6, y: 3)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmBorder, lineWidth: 1))
    }

    private func actionButton(icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(color)
                    .frame(width: 40, height: 40)
                    .background(color.opacity(0.1))
                    .cornerRadius(12)
                Text(label)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(color)
            }
        }
    }

    // MARK: - Contact Section

    private var contactSection: some View {
        DetailSection(title: "Contact", icon: "phone.fill", iconColor: .palmPrimary) {
            VStack(spacing: 0) {
                if let phone = client.phone, !phone.isEmpty {
                    detailRow(icon: "phone.fill", label: "Phone", value: phone, color: .palmPrimary)
                }
                if let phone2 = client.phone_secondary, !phone2.isEmpty {
                    detailDivider
                    detailRow(icon: "phone", label: "Secondary Phone", value: phone2, color: .palmPrimary)
                }
                if let email = client.email, !email.isEmpty {
                    detailDivider
                    detailRow(icon: "envelope.fill", label: "Email", value: email, color: .palmBlue)
                }
                if let address = client.address, !address.isEmpty {
                    detailDivider
                    let full = [address, client.city, client.state, client.zip_code]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: ", ")
                    detailRow(icon: "mappin.circle.fill", label: "Address", value: full, color: .palmOrange)
                }
            }
        }
    }

    // MARK: - Emergency Section

    private var emergencySection: some View {
        DetailSection(title: "Emergency Contacts", icon: "exclamationmark.shield.fill", iconColor: .red) {
            VStack(spacing: 0) {
                if let ecName = client.emergency_contact_name, !ecName.isEmpty {
                    let ecDetail = [ecName, client.emergency_contact_phone, client.emergency_contact_relationship]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: " · ")
                    detailRow(icon: "1.circle.fill", label: "Primary Contact", value: ecDetail, color: .red)
                }
                if let ec2Name = client.emergency_contact_2_name, !ec2Name.isEmpty {
                    detailDivider
                    let ec2Detail = [ec2Name, client.emergency_contact_2_phone, client.emergency_contact_2_relationship]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: " · ")
                    detailRow(icon: "2.circle.fill", label: "Secondary Contact", value: ec2Detail, color: .palmOrange)
                }
            }
        }
    }

    // MARK: - Medical Section

    private var medicalSection: some View {
        DetailSection(title: "Medical", icon: "heart.fill", iconColor: .red) {
            VStack(spacing: 0) {
                var showDivider = false

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    detailRow(icon: "stethoscope", label: "Primary Diagnosis", value: diagnosis, color: .palmPrimary)
                    let _ = (showDivider = true)
                }
                if let secondary = client.secondary_diagnoses, !secondary.isEmpty {
                    if showDivider { detailDivider }
                    detailRow(icon: "list.clipboard", label: "Secondary Diagnoses", value: secondary, color: .palmPrimary)
                    let _ = (showDivider = true)
                }
                if let meds = client.medications, !meds.isEmpty {
                    if showDivider { detailDivider }
                    detailRow(icon: "pills.fill", label: "Medications", value: meds, color: .palmPurple)
                    let _ = (showDivider = true)
                }
                if let allergies = client.allergies, !allergies.isEmpty {
                    if showDivider { detailDivider }
                    detailRow(icon: "allergens", label: "Allergies", value: allergies, color: .red)
                    let _ = (showDivider = true)
                }
                if let physician = client.physician_name, !physician.isEmpty {
                    if showDivider { detailDivider }
                    let physicianDetail = [physician, client.physician_phone]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: " · ")
                    detailRow(icon: "person.badge.shield.checkmark.fill", label: "Physician", value: physicianDetail, color: .palmBlue)
                    let _ = (showDivider = true)
                }
                if let mobility = client.mobility_status, !mobility.isEmpty {
                    if showDivider { detailDivider }
                    detailRow(icon: "figure.walk", label: "Mobility", value: mobility.replacingOccurrences(of: "_", with: " ").capitalized, color: .palmPurple)
                    let _ = (showDivider = true)
                }
                if let cognitive = client.cognitive_status, !cognitive.isEmpty {
                    if showDivider { detailDivider }
                    detailRow(icon: "brain.head.profile", label: "Cognitive", value: cognitive.replacingOccurrences(of: "_", with: " ").capitalized, color: .palmPurple)
                    let _ = (showDivider = true)
                }
                if let medNotes = client.medical_notes, !medNotes.isEmpty {
                    if showDivider { detailDivider }
                    detailRow(icon: "note.text", label: "Medical Notes", value: medNotes, color: .palmSecondary)
                }
            }
        }
    }

    // MARK: - Care Plan Section

    private var careSection: some View {
        DetailSection(title: "Care Plan", icon: "doc.text.fill", iconColor: .palmPrimary) {
            VStack(spacing: 0) {
                if let level = client.care_level, !level.isEmpty {
                    detailRow(icon: "heart.text.square", label: "Care Level", value: level, color: .palmPrimary)
                }
                if let living = client.living_situation, !living.isEmpty {
                    detailDivider
                    detailRow(icon: "house.fill", label: "Living Situation", value: living.replacingOccurrences(of: "_", with: " ").capitalized, color: .palmOrange)
                }
                if let plan = client.care_plan, !plan.isEmpty {
                    detailDivider
                    detailRow(icon: "doc.plaintext", label: "Care Plan", value: plan, color: .palmBlue)
                }
                if let special = client.special_requirements, !special.isEmpty {
                    detailDivider
                    detailRow(icon: "exclamationmark.triangle.fill", label: "Special Requirements", value: special, color: .palmOrange)
                }
            }
        }
    }

    // MARK: - Insurance Section

    private var insuranceSection: some View {
        DetailSection(title: "Insurance", icon: "shield.fill", iconColor: .palmGreen) {
            VStack(spacing: 0) {
                if let provider = client.insurance_provider, !provider.isEmpty {
                    let insuranceDetail = [provider, client.insurance_id]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: " · #")
                    detailRow(icon: "shield.fill", label: "Insurance", value: insuranceDetail, color: .palmPrimary)
                }
                if let medicaid = client.medicaid_id, !medicaid.isEmpty {
                    detailDivider
                    detailRow(icon: "creditcard.fill", label: "Medicaid ID", value: medicaid, color: .palmGreen)
                }
                if let medicare = client.medicare_id, !medicare.isEmpty {
                    detailDivider
                    detailRow(icon: "creditcard", label: "Medicare ID", value: medicare, color: .palmBlue)
                }
                if let billing = client.billing_address, !billing.isEmpty {
                    detailDivider
                    detailRow(icon: "mappin.circle.fill", label: "Billing Address", value: billing, color: .palmOrange)
                }
            }
        }
    }

    // MARK: - Scheduling Section

    private var schedulingSection: some View {
        DetailSection(title: "Scheduling", icon: "calendar", iconColor: .palmBlue) {
            VStack(spacing: 0) {
                if let days = client.preferred_days, !days.isEmpty {
                    detailRow(icon: "calendar.badge.clock", label: "Preferred Days", value: days, color: .palmPrimary)
                }
                if let times = client.preferred_times, !times.isEmpty {
                    detailDivider
                    detailRow(icon: "clock.fill", label: "Preferred Times", value: times, color: .palmBlue)
                }
                if let intake = client.intake_date, !intake.isEmpty {
                    detailDivider
                    detailRow(icon: "calendar.badge.plus", label: "Intake Date", value: intake, color: .palmGreen)
                }
                if let discharge = client.discharge_date, !discharge.isEmpty {
                    detailDivider
                    detailRow(icon: "calendar.badge.minus", label: "Discharge Date", value: discharge, color: .palmOrange)
                }
                if let extId = client.external_id, !extId.isEmpty {
                    detailDivider
                    let extDetail = [extId, client.external_source]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: " · ")
                    detailRow(icon: "building.2.fill", label: "External ID", value: extDetail, color: .palmPurple)
                }
            }
        }
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        DetailSection(title: "Notes", icon: "note.text", iconColor: .palmSecondary) {
            VStack(spacing: 0) {
                if let notes = client.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundColor(.palmText)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(14)
                }
            }
        }
    }

    // MARK: - Visits Section

    private var visitsSection: some View {
        DetailSection(title: "Visits (\(clientVisits.count))", icon: "clock.arrow.circlepath", iconColor: .palmPrimary) {
            if isLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .padding(.vertical, 20)
            } else if clientVisits.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 26))
                        .foregroundColor(.palmSecondary.opacity(0.35))
                    Text("No visits yet")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(clientVisits.enumerated()), id: \.element.id) { index, visit in
                        visitRow(visit)
                        if index < clientVisits.count - 1 {
                            Divider().padding(.leading, 54)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Row Helpers

    private var detailDivider: some View {
        Divider().padding(.leading, 54)
    }

    private func detailRow(icon: String, label: String, value: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(color)
                .frame(width: 30, height: 30)
                .background(color.opacity(0.1))
                .cornerRadius(8)

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

    private func visitRow(_ visit: Visit) -> some View {
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

    private func formattedDate(_ isoString: String) -> String {
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

    private func loadVisits() async {
        do {
            let fetched = try await api.fetchVisits()
            await MainActor.run {
                visits = fetched
                isLoading = false
            }
        } catch {
            await MainActor.run { isLoading = false }
        }
    }
}

// MARK: - Reusable Detail Section Card

private struct DetailSection<Content: View>: View {
    let title: String
    var icon: String = ""
    var iconColor: Color = .palmSecondary
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                if !icon.isEmpty {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(iconColor)
                }
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmSecondary)
            }
            .padding(.leading, 4)
            .padding(.bottom, 8)

            VStack(spacing: 0) {
                content
            }
            .background(Color.white)
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
        }
    }
}
