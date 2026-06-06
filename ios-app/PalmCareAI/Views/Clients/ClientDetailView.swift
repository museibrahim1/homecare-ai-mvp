import SwiftUI

struct ClientDetailView: View {
    @EnvironmentObject var api: APIService
    @State var client: Client

    @State var visits: [Visit] = []
    @State var isLoading = true
    @State var loadError: String?
    @State var showEditSheet = false

    var clientVisits: [Visit] {
        visits.filter { $0.client_id == client.id }
    }

    var statusColor: Color {
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
                .accessibilityLabel("Edit client")
            }
        }
        .sheet(isPresented: $showEditSheet) {
            AddClientSheet(editingClient: client, onClientCreated: { updated in
                client = updated
            })
            .environmentObject(api)
        }
        .task { await loadVisits() }
    }

    // MARK: - Section Checks

    var hasContactInfo: Bool {
        [client.phone, client.phone_secondary, client.email, client.address]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    var hasEmergencyInfo: Bool {
        [client.emergency_contact_name, client.emergency_contact_2_name]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    var hasMedicalInfo: Bool {
        [client.primary_diagnosis, client.secondary_diagnoses, client.medications,
         client.allergies, client.physician_name, client.mobility_status, client.cognitive_status, client.medical_notes]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    var hasCareInfo: Bool {
        [client.care_level, client.living_situation, client.care_plan, client.special_requirements]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    var hasInsuranceInfo: Bool {
        [client.insurance_provider, client.insurance_id, client.medicaid_id, client.medicare_id, client.billing_address]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    var hasSchedulingInfo: Bool {
        [client.preferred_days, client.preferred_times, client.intake_date, client.discharge_date,
         client.external_id, client.external_source]
            .compactMap { $0 }.contains { !$0.isEmpty }
    }

    var hasNotes: Bool {
        if let n = client.notes, !n.isEmpty { return true }
        return false
    }

}

// MARK: - Reusable Detail Section Card

struct DetailSection<Content: View>: View {
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
                        .accessibilityHidden(true)
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
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
        }
    }
}
