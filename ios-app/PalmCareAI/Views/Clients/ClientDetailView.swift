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

    /// Newest client visit first — used for the "Open visit" link on the
    /// Latest Assessment card and for ordering the Visits list.
    var clientVisitsNewestFirst: [Visit] {
        clientVisits.sorted { $0.created_at > $1.created_at }
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

    /// Only a small, known status word becomes a badge. AI/import data can
    /// leave long placeholder strings in `status`.
    var statusLabel: String? {
        let raw = client.displayStatus.trimmingCharacters(in: .whitespacesAndNewlines)
        switch raw.lowercased() {
        case "active": return "Active"
        case "inactive": return "Inactive"
        case "discharged": return "Discharged"
        case "pending": return "Pending"
        default: return nil
        }
    }

    /// Mirror `ClientsView` — only render a care-level badge for known, short
    /// values (Low / Medium / High). Long AI placeholders are dropped.
    var careLevelLabel: String? {
        guard let raw = client.care_level?.trimmingCharacters(in: .whitespacesAndNewlines),
              !raw.isEmpty else { return nil }
        switch raw.uppercased() {
        case "LOW": return "Low"
        case "MODERATE", "MEDIUM": return "Moderate"
        case "HIGH": return "High risk"
        default: return nil
        }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 10) {
                heroCard

                if hasContactInfo { contactSection }
                if hasEmergencyInfo { emergencySection }
                medicalSection
                latestAssessmentSection
                careSection
                insuranceSection
                schedulingSection
                if hasNotes { notesSection }

                visitsSection
            }
            .padding(.horizontal, 24)
            .padding(.top, 8)
            .padding(.bottom, 120)
        }
        .background(PalmGlassBackground())
        .navigationTitle("Client profile")
        .navigationBarTitleDisplayMode(.inline)
        .palmTransparentNavBar()
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showEditSheet = true
                } label: {
                    Text("Edit")
                        .font(.system(size: 16, weight: .semibold))
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
            .contains { cleaned($0) != nil }
    }

    var hasEmergencyInfo: Bool {
        cleaned(client.emergency_contact_name) != nil || cleaned(client.emergency_contact_2_name) != nil
    }

    /// Medical facts only — deliberately excludes `medical_notes` (the raw
    /// assessment transcript is surfaced separately as Latest Assessment).
    var hasMedicalInfo: Bool {
        [client.primary_diagnosis, client.allergies, client.medications,
         client.mobility_status, client.cognitive_status, client.physician_name]
            .contains { cleaned($0) != nil }
    }

    var hasCareInfo: Bool {
        careLevelLabel != nil || cleaned(client.living_situation) != nil || cleaned(client.care_plan) != nil
    }

    var hasInsuranceInfo: Bool {
        [client.insurance_provider, client.insurance_id, client.medicaid_id, client.medicare_id, client.billing_address]
            .contains { cleaned($0) != nil }
    }

    var hasSchedulingInfo: Bool {
        [client.preferred_days, client.preferred_times, client.intake_date, client.discharge_date, client.external_id]
            .contains { cleaned($0) != nil }
    }

    var hasNotes: Bool {
        cleaned(client.notes) != nil
    }
}

// MARK: - Reusable eyebrow glass section (Pipeline Glass)

struct DetailSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            PalmSectionEyebrow(text: title)
                .padding(.horizontal, 16)
                .padding(.top, 14)

            VStack(spacing: 0) {
                content
            }
            .padding(.bottom, 6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .palmGlassCard(radius: 24, fillOpacity: 0.54)
    }
}
