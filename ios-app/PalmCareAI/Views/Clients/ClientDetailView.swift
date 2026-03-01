import SwiftUI

struct ClientDetailView: View {
    @EnvironmentObject var api: APIService
    let client: Client

    @State private var visits: [Visit] = []
    @State private var isLoading = true

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

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                profileCard
                contactSection
                if client.primary_diagnosis != nil || client.medications != nil || client.allergies != nil {
                    medicalSection
                }
                visitsSection
            }
            .padding(.horizontal, 18)
            .padding(.top, 10)
            .padding(.bottom, 120)
        }
        .background(Color.palmBackground)
        .navigationTitle(client.full_name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadVisits() }
    }

    // MARK: - Profile Card

    private var profileCard: some View {
        VStack(spacing: 14) {
            Circle()
                .fill(avatarColor)
                .frame(width: 64, height: 64)
                .overlay(
                    Text(initials)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                )

            VStack(spacing: 4) {
                Text(client.full_name)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.palmText)

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    Text(diagnosis)
                        .font(.system(size: 13))
                        .foregroundColor(.palmSecondary)
                }
            }

            HStack(spacing: 12) {
                statusBadge(client.displayStatus)

                if let careLevel = client.care_level, !careLevel.isEmpty {
                    infoBadge(icon: "heart.fill", text: careLevel, color: .pink)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmBorder, lineWidth: 1))
    }

    // MARK: - Contact Section

    private var contactSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionHeader("Contact Information")

            VStack(spacing: 0) {
                if let phone = client.phone, !phone.isEmpty {
                    infoRow(icon: "phone.fill", label: "Phone", value: phone, color: .palmPrimary)
                    SettingsDivider()
                }
                if let email = client.email, !email.isEmpty {
                    infoRow(icon: "envelope.fill", label: "Email", value: email, color: .blue)
                    SettingsDivider()
                }
                if let address = client.address, !address.isEmpty {
                    let full = [address, client.city, client.state, client.zip_code]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: ", ")
                    infoRow(icon: "mappin.circle.fill", label: "Address", value: full, color: .orange)
                }
                if let ecName = client.emergency_contact_name, !ecName.isEmpty {
                    SettingsDivider()
                    let ecDetail = [ecName, client.emergency_contact_phone, client.emergency_contact_relationship]
                        .compactMap { $0 }
                        .filter { !$0.isEmpty }
                        .joined(separator: " · ")
                    infoRow(icon: "exclamationmark.shield.fill", label: "Emergency", value: ecDetail, color: .red)
                }
            }
            .background(Color.white)
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    // MARK: - Medical Section

    private var medicalSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionHeader("Medical Information")

            VStack(spacing: 0) {
                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    infoRow(icon: "stethoscope", label: "Diagnosis", value: diagnosis, color: .palmPrimary)
                }
                if let meds = client.medications, !meds.isEmpty {
                    SettingsDivider()
                    infoRow(icon: "pills.fill", label: "Medications", value: meds, color: .purple)
                }
                if let allergies = client.allergies, !allergies.isEmpty {
                    SettingsDivider()
                    infoRow(icon: "allergens", label: "Allergies", value: allergies, color: .red)
                }
                if let physician = client.physician_name, !physician.isEmpty {
                    SettingsDivider()
                    infoRow(icon: "person.badge.shield.checkmark.fill", label: "Physician", value: physician, color: .blue)
                }
            }
            .background(Color.white)
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    // MARK: - Visits Section

    private var visitsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionHeader("Recent Visits (\(clientVisits.count))")

            if isLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .padding(.vertical, 24)
                    .background(Color.white)
                    .cornerRadius(14)
            } else if clientVisits.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 28))
                        .foregroundColor(.palmSecondary.opacity(0.4))
                    Text("No visits yet")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                .background(Color.white)
                .cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(clientVisits.enumerated()), id: \.element.id) { index, visit in
                        visitRow(visit)
                        if index < clientVisits.count - 1 {
                            Divider().padding(.leading, 58)
                        }
                    }
                }
                .background(Color.white)
                .cornerRadius(14)
                .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
            }
        }
    }

    // MARK: - Helpers

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(.palmSecondary)
            .padding(.leading, 4)
            .padding(.bottom, 8)
    }

    private func statusBadge(_ status: String) -> some View {
        let color: Color = status.lowercased() == "active" ? .green : .orange
        return Text(status.capitalized)
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.1))
            .cornerRadius(12)
    }

    private func infoBadge(icon: String, text: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon).font(.system(size: 10))
            Text(text).font(.system(size: 11, weight: .medium))
        }
        .foregroundColor(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }

    private func infoRow(icon: String, label: String, value: String, color: Color) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(color)
                .frame(width: 32, height: 32)
                .background(color.opacity(0.1))
                .cornerRadius(8)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
                Text(value)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.palmText)
            }

            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    private func visitRow(_ visit: Visit) -> some View {
        HStack(spacing: 12) {
            let statusColor: Color = {
                switch visit.status.lowercased() {
                case "completed": return .green
                case "processing": return .blue
                case "pending": return .orange
                default: return .palmSecondary
                }
            }()

            Circle()
                .fill(statusColor.opacity(0.15))
                .frame(width: 32, height: 32)
                .overlay(
                    Image(systemName: visit.status.lowercased() == "completed" ? "checkmark" : "clock")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(statusColor)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(visit.status.capitalized)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmText)
                Text(formattedDate(visit.created_at))
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
            }

            Spacer()

            Text(visit.status.capitalized)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(statusColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(statusColor.opacity(0.1))
                .cornerRadius(12)
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
