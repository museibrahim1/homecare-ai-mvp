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
        case "pending", "intake": return .palmBlue
        default: return .palmSecondary
        }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                profileCard
                contactSection
                emergencySection
                medicalSection
                careSection
                insuranceSection
                schedulingSection
                visitsSection
                notesSection
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
                    Image(systemName: "pencil.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.palmPrimary)
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            AddClientSheet(editingClient: client)
        }
        .task { await loadVisits() }
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
                        Image(systemName: "calendar")
                            .font(.system(size: 10))
                            .foregroundColor(.palmBlue)
                        Text(dob)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.palmBlue)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 5)
                    .background(Color.palmBlue.opacity(0.08))
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

    @ViewBuilder
    private var contactSection: some View {
        let rows: [(String, String, String, Color)] = [
            ("phone.fill", "Phone", client.phone ?? "", .palmPrimary),
            ("phone", "Secondary Phone", client.phone_secondary ?? "", .palmPrimary),
            ("envelope.fill", "Email", client.email ?? "", .palmBlue),
            ("mappin.circle.fill", "Address", fullAddress, .palmOrange),
        ].filter { !$0.2.isEmpty }

        if !rows.isEmpty {
            DetailSection(title: "Contact", icon: "phone.fill", iconColor: .palmPrimary) {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                        detailRow(icon: row.0, label: row.1, value: row.2, color: row.3)
                        if index < rows.count - 1 { detailDivider }
                    }
                }
            }
        }
    }

    private var fullAddress: String {
        [client.address, client.city, client.state, client.zip_code]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }

    // MARK: - Emergency Section

    @ViewBuilder
    private var emergencySection: some View {
        let ec1 = emergencyContactText(name: client.emergency_contact_name, phone: client.emergency_contact_phone, relationship: client.emergency_contact_relationship)
        let ec2 = emergencyContactText(name: client.emergency_contact_2_name, phone: client.emergency_contact_2_phone, relationship: client.emergency_contact_2_relationship)

        if !ec1.isEmpty || !ec2.isEmpty {
            DetailSection(title: "Emergency Contacts", icon: "exclamationmark.shield.fill", iconColor: .red) {
                VStack(spacing: 0) {
                    if !ec1.isEmpty {
                        detailRow(icon: "person.fill", label: "Primary Contact", value: ec1, color: .red)
                    }
                    if !ec1.isEmpty && !ec2.isEmpty { detailDivider }
                    if !ec2.isEmpty {
                        detailRow(icon: "person.fill", label: "Secondary Contact", value: ec2, color: .palmOrange)
                    }
                }
            }
        }
    }

    private func emergencyContactText(name: String?, phone: String?, relationship: String?) -> String {
        [name, phone, relationship]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
    }

    // MARK: - Medical Section

    @ViewBuilder
    private var medicalSection: some View {
        let rows: [(String, String, String, Color)] = [
            ("stethoscope", "Primary Diagnosis", client.primary_diagnosis ?? "", .palmPrimary),
            ("cross.case.fill", "Secondary Diagnoses", client.secondary_diagnoses ?? "", .palmPrimary),
            ("pills.fill", "Medications", client.medications ?? "", .palmPurple),
            ("allergens", "Allergies", client.allergies ?? "", .red),
            ("person.badge.shield.checkmark.fill", "Physician", physicianDisplay, .palmBlue),
            ("figure.walk", "Mobility", client.mobility_status?.replacingOccurrences(of: "_", with: " ").capitalized ?? "", .palmOrange),
            ("brain.head.profile", "Cognitive Status", client.cognitive_status?.replacingOccurrences(of: "_", with: " ").capitalized ?? "", .palmPurple),
            ("note.text", "Medical Notes", client.medical_notes ?? "", .palmSecondary),
        ].filter { !$0.2.isEmpty }

        if !rows.isEmpty {
            DetailSection(title: "Medical", icon: "heart.fill", iconColor: .red) {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                        detailRow(icon: row.0, label: row.1, value: row.2, color: row.3)
                        if index < rows.count - 1 { detailDivider }
                    }
                }
            }
        }
    }

    private var physicianDisplay: String {
        [client.physician_name, client.physician_phone]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
    }

    // MARK: - Care Plan Section

    @ViewBuilder
    private var careSection: some View {
        let rows: [(String, String, String, Color)] = [
            ("heart.fill", "Care Level", client.care_level ?? "", .palmPink),
            ("house.fill", "Living Situation", client.living_situation?.replacingOccurrences(of: "_", with: " ").capitalized ?? "", .palmOrange),
            ("doc.text.fill", "Care Plan", client.care_plan ?? "", .palmPrimary),
            ("exclamationmark.triangle.fill", "Special Requirements", client.special_requirements ?? "", .palmOrange),
        ].filter { !$0.2.isEmpty }

        if !rows.isEmpty {
            DetailSection(title: "Care Plan", icon: "doc.text.fill", iconColor: .palmPrimary) {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                        detailRow(icon: row.0, label: row.1, value: row.2, color: row.3)
                        if index < rows.count - 1 { detailDivider }
                    }
                }
            }
        }
    }

    // MARK: - Insurance Section

    @ViewBuilder
    private var insuranceSection: some View {
        let rows: [(String, String, String, Color)] = [
            ("shield.fill", "Insurance Provider", client.insurance_provider ?? "", .palmPrimary),
            ("number", "Policy Number", client.insurance_id ?? "", .palmSecondary),
            ("creditcard.fill", "Medicaid ID", client.medicaid_id ?? "", .palmGreen),
            ("creditcard.fill", "Medicare ID", client.medicare_id ?? "", .palmBlue),
            ("mappin.circle.fill", "Billing Address", client.billing_address ?? "", .palmOrange),
        ].filter { !$0.2.isEmpty }

        if !rows.isEmpty {
            DetailSection(title: "Insurance & Billing", icon: "shield.fill", iconColor: .palmGreen) {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                        detailRow(icon: row.0, label: row.1, value: row.2, color: row.3)
                        if index < rows.count - 1 { detailDivider }
                    }
                }
            }
        }
    }

    // MARK: - Scheduling Section

    @ViewBuilder
    private var schedulingSection: some View {
        let rows: [(String, String, String, Color)] = [
            ("calendar", "Preferred Days", client.preferred_days ?? "", .palmPrimary),
            ("clock.fill", "Preferred Times", client.preferred_times ?? "", .palmBlue),
            ("arrow.right.circle.fill", "Intake Date", client.intake_date ?? "", .palmGreen),
            ("arrow.left.circle.fill", "Discharge Date", client.discharge_date ?? "", .palmOrange),
            ("building.2.fill", "External ID", client.external_id ?? "", .palmPurple),
            ("link", "External Source", client.external_source ?? "", .palmSecondary),
        ].filter { !$0.2.isEmpty }

        if !rows.isEmpty {
            DetailSection(title: "Scheduling", icon: "calendar", iconColor: .palmBlue) {
                VStack(spacing: 0) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                        detailRow(icon: row.0, label: row.1, value: row.2, color: row.3)
                        if index < rows.count - 1 { detailDivider }
                    }
                }
            }
        }
    }

    // MARK: - Notes Section

    @ViewBuilder
    private var notesSection: some View {
        if let notes = client.notes, !notes.isEmpty {
            DetailSection(title: "Notes", icon: "note.text", iconColor: .palmSecondary) {
                Text(notes)
                    .font(.system(size: 13))
                    .foregroundColor(.palmText)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(14)
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
        let statusColor: Color = {
            switch visit.status.lowercased() {
            case "completed": return .palmGreen
            case "processing": return .palmBlue
            case "pending": return .palmOrange
            default: return .palmSecondary
            }
        }()

        return HStack(spacing: 12) {
            Circle()
                .fill(statusColor.opacity(0.12))
                .frame(width: 34, height: 34)
                .overlay(
                    Image(systemName: visit.status.lowercased() == "completed" ? "checkmark" : "clock")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(statusColor)
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
                .foregroundColor(statusColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(statusColor.opacity(0.1))
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
