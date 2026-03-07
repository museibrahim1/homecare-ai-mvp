import SwiftUI

struct AddClientSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    var editingClient: Client?
    var onClientCreated: ((Client) -> Void)?

    @State private var fullName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var careLevel = ""
    @State private var insuranceType = ""
    @State private var primaryDiagnosis = ""
    @State private var notes = ""

    @State private var medicaidId = ""
    @State private var medicareId = ""
    @State private var insuranceProvider = ""

    @State private var isLoading = false
    @State private var errorMessage: String?

    private var isEditing: Bool { editingClient != nil }

    private let priorityOptions: [(String, String, Color)] = [
        ("LOW", "Low", .palmGreen),
        ("MODERATE", "Medium", .palmOrange),
        ("HIGH", "High", Color(red: 239/255, green: 68/255, blue: 68/255)),
        ("URGENT", "Urgent", Color(red: 190/255, green: 18/255, blue: 60/255)),
    ]

    private let insuranceOptions: [(String, String)] = [
        ("medicaid", "Medicaid"),
        ("medicare", "Medicare"),
        ("private", "Private"),
    ]

    private let specialtyOptions: [(String, String)] = [
        ("", "Select specialty..."),
        ("traumatic_brain_injury", "Traumatic Brain Injury"),
        ("alzheimers_dementia", "Alzheimer's / Dementia"),
        ("diabetes", "Diabetes"),
        ("cardiac", "Cardiac Care"),
        ("copd", "COPD / Respiratory"),
        ("stroke_rehab", "Stroke Rehabilitation"),
        ("orthopedic", "Orthopedic / Mobility"),
        ("wound_care", "Wound Care"),
        ("palliative", "Palliative Care"),
        ("pediatric", "Pediatric Home Care"),
        ("mental_health", "Mental Health"),
        ("other", "Other"),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                sheetHeader

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        nameField
                        inputField("Email", text: $email, placeholder: "john@email.com", icon: "envelope.fill", keyboard: .emailAddress, contentType: .emailAddress)
                        inputField("Phone", text: $phone, placeholder: "+1 555 123 4567", icon: "phone.fill", keyboard: .phonePad, contentType: .telephoneNumber)
                        inputField("Address", text: $address, placeholder: "123 Main St, City, State", icon: "mappin.circle.fill", contentType: .fullStreetAddress)
                        prioritySection
                        insuranceSection
                        specialtySection
                        notesField

                        if let error = errorMessage {
                            HStack(spacing: 6) {
                                Image(systemName: "exclamationmark.circle.fill")
                                    .font(.system(size: 12))
                                Text(error)
                                    .font(.system(size: 12))
                            }
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        submitButton
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 40)
                }
            }
            .background(Color(UIColor.systemBackground))
            .toolbar(.hidden, for: .navigationBar)
            .onAppear { populateFromClient() }
        }
    }

    private var sheetHeader: some View {
        HStack {
            Text(isEditing ? "Edit Client" : "Add New Client")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.palmText)
            Spacer()
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmSecondary)
                    .frame(width: 30, height: 30)
                    .background(Color.palmFieldBg)
                    .clipShape(Circle())
            }
            .accessibilityLabel("Close")
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(Color(UIColor.systemBackground))
        .overlay(alignment: .bottom) {
            Divider().background(Color.palmBorder.opacity(0.7))
        }
    }

    // MARK: - Name Field

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Full Name")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)

            HStack(spacing: 10) {
                Image(systemName: "person.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.palmSecondary)
                    .accessibilityHidden(true)

                TextField("John Smith", text: $fullName)
                    .font(.system(size: 15))
                    .foregroundColor(.palmText)
                    .textContentType(.name)
                    .autocapitalization(.words)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(fullName.isEmpty ? Color.palmBorder : Color.palmPrimary.opacity(0.5), lineWidth: 1)
            )
        }
    }

    // MARK: - Input Field

    private func inputField(_ label: String, text: Binding<String>, placeholder: String,
                            icon: String, keyboard: UIKeyboardType = .default,
                            contentType: UITextContentType? = nil) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)

            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(.palmSecondary)
                    .accessibilityHidden(true)

                TextField(placeholder, text: text)
                    .font(.system(size: 15))
                    .foregroundColor(.palmText)
                    .keyboardType(keyboard)
                    .textContentType(contentType)
                    .autocapitalization(keyboard == .emailAddress ? .none : .words)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    // MARK: - Priority Chips

    private var prioritySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Priority")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)

            HStack(spacing: 8) {
                ForEach(priorityOptions, id: \.0) { value, label, color in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            careLevel = careLevel == value ? "" : value
                        }
                    } label: {
                        HStack(spacing: 5) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(color)
                                .frame(width: 3, height: 14)
                            Text(label)
                                .font(.system(size: 13, weight: careLevel == value ? .bold : .medium))
                        }
                        .foregroundColor(careLevel == value ? color : .palmSecondary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 9)
                        .background(careLevel == value ? color.opacity(0.1) : Color(UIColor.systemBackground))
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(careLevel == value ? color.opacity(0.4) : Color.palmBorder, lineWidth: 1)
                        )
                    }
                    .accessibilityLabel("\(label) priority\(careLevel == value ? ", selected" : "")")
                }
            }
        }
    }

    // MARK: - Insurance Type Chips

    private var insuranceSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Insurance Type")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)

            HStack(spacing: 8) {
                ForEach(insuranceOptions, id: \.0) { value, label in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            insuranceType = insuranceType == value ? "" : value
                        }
                    } label: {
                        Text(label)
                            .font(.system(size: 13, weight: insuranceType == value ? .bold : .medium))
                            .foregroundColor(insuranceType == value ? .palmPrimary : .palmSecondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 9)
                            .background(insuranceType == value ? Color.palmPrimary.opacity(0.1) : Color(UIColor.systemBackground))
                            .cornerRadius(10)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(insuranceType == value ? Color.palmPrimary.opacity(0.4) : Color.palmBorder, lineWidth: 1)
                            )
                    }
                    .accessibilityLabel("\(label) insurance\(insuranceType == value ? ", selected" : "")")
                }
                Spacer()
            }

            if insuranceType == "medicaid" {
                inputField("Medicaid ID", text: $medicaidId, placeholder: "MCD987654321", icon: "creditcard.fill")
                    .transition(.opacity.combined(with: .move(edge: .top)))
            } else if insuranceType == "medicare" {
                inputField("Medicare ID", text: $medicareId, placeholder: "MCR123456789", icon: "creditcard.fill")
                    .transition(.opacity.combined(with: .move(edge: .top)))
            } else if insuranceType == "private" {
                inputField("Insurance Provider", text: $insuranceProvider, placeholder: "Blue Cross Blue Shield", icon: "building.2.fill")
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    // MARK: - Care Specialty

    private var specialtySection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Care Specialty")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)

            Menu {
                ForEach(specialtyOptions, id: \.0) { value, label in
                    Button(label) { primaryDiagnosis = value }
                }
            } label: {
                HStack {
                    Text(specialtyOptions.first(where: { $0.0 == primaryDiagnosis })?.1 ?? "Select specialty...")
                        .font(.system(size: 15))
                        .foregroundColor(primaryDiagnosis.isEmpty ? .palmSecondary : .palmText)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmSecondary)
                        .accessibilityHidden(true)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 13)
                .background(Color(UIColor.systemBackground))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
            }
            .accessibilityLabel("Care specialty, \(specialtyOptions.first(where: { $0.0 == primaryDiagnosis })?.1 ?? "none selected")")
        }
    }

    // MARK: - Notes

    private var notesField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Referral Notes")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)

            TextField("Referral source, special requirements...", text: $notes, axis: .vertical)
                .font(.system(size: 15))
                .foregroundColor(.palmText)
                .lineLimit(3...5)
                .padding(.horizontal, 14)
                .padding(.vertical, 13)
                .background(Color(UIColor.systemBackground))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    // MARK: - Submit

    private var submitButton: some View {
        Button { Task { await saveClient() } } label: {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView().tint(.white).scaleEffect(0.85)
                } else {
                    Image(systemName: isEditing ? "checkmark" : "plus")
                        .font(.system(size: 13, weight: .bold))
                }
                Text(isLoading ? "Saving..." : (isEditing ? "Save Changes" : "Add Client"))
                    .font(.system(size: 16, weight: .bold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                LinearGradient(colors: [.palmPrimary, .palmTeal600], startPoint: .leading, endPoint: .trailing)
                    .opacity(canSubmit ? 1 : 0.4)
            )
            .cornerRadius(14)
            .shadow(color: Color.palmPrimary.opacity(canSubmit ? 0.3 : 0), radius: 8, y: 4)
        }
        .disabled(!canSubmit || isLoading)
        .accessibilityLabel(isEditing ? "Save client changes" : "Add new client")
    }

    // MARK: - Logic

    private var canSubmit: Bool {
        !fullName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func populateFromClient() {
        guard let c = editingClient else { return }
        fullName = c.full_name
        email = c.email ?? ""
        phone = c.phone ?? ""
        address = [c.address, c.city, c.state, c.zip_code]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
        careLevel = c.care_level ?? ""
        primaryDiagnosis = c.primary_diagnosis ?? ""
        notes = c.notes ?? ""
        medicaidId = c.medicaid_id ?? ""
        medicareId = c.medicare_id ?? ""
        insuranceProvider = c.insurance_provider ?? ""

        if !(c.medicaid_id ?? "").isEmpty { insuranceType = "medicaid" }
        else if !(c.medicare_id ?? "").isEmpty { insuranceType = "medicare" }
        else if !(c.insurance_provider ?? "").isEmpty { insuranceType = "private" }
    }

    private func buildBody() -> [String: Any] {
        var body: [String: Any] = ["full_name": fullName.trimmingCharacters(in: .whitespaces)]

        let fields: [(String, String)] = [
            ("email", email), ("phone", phone), ("address", address),
            ("care_level", careLevel), ("primary_diagnosis", primaryDiagnosis),
            ("notes", notes), ("medicaid_id", medicaidId), ("medicare_id", medicareId),
            ("insurance_provider", insuranceProvider),
        ]

        for (key, value) in fields {
            let trimmed = value.trimmingCharacters(in: .whitespaces)
            if !trimmed.isEmpty { body[key] = trimmed }
        }

        return body
    }

    private func saveClient() async {
        isLoading = true
        errorMessage = nil

        let body = buildBody()

        do {
            if let existing = editingClient {
                let updated = try await api.updateClient(id: existing.id, body: body)
                await MainActor.run {
                    isLoading = false
                    onClientCreated?(updated)
                    dismiss()
                }
            } else {
                let client = try await api.createClient(body: body)
                await MainActor.run {
                    isLoading = false
                    onClientCreated?(client)
                    dismiss()
                }
            }
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Form Field Style (keep for backward compat)

extension View {
    func formFieldStyle() -> some View {
        self
            .font(.system(size: 14))
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.palmBorder, lineWidth: 1)
            )
    }
}
