import SwiftUI

struct AddClientSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    var onClientCreated: ((Client) -> Void)?

    @State private var fullName = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var address = ""
    @State private var careLevel = ""
    @State private var primaryDiagnosis = ""
    @State private var notes = ""
    @State private var insuranceType = ""
    @State private var medicaidId = ""
    @State private var medicareId = ""
    @State private var insuranceProvider = ""

    @State private var isLoading = false
    @State private var errorMessage: String?

    private let priorityOptions = [
        ("LOW", "Low", Color.palmGreen),
        ("MEDIUM", "Medium", Color.palmOrange),
        ("HIGH", "High", Color(red: 234/255, green: 88/255, blue: 12/255)),
        ("URGENT", "Urgent", Color(red: 220/255, green: 38/255, blue: 38/255))
    ]

    private let careSpecialties = [
        "General Care", "Dementia Care", "Post-Surgery", "Cardiac Care",
        "Diabetes Management", "Hospice Support", "Physical Therapy",
        "Wound Care", "Respiratory Care"
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerIcon

                    VStack(spacing: 16) {
                        formField(label: "Name", required: true) {
                            TextField("John Smith", text: $fullName)
                                .textContentType(.name)
                                .formFieldStyle()
                        }

                        formField(label: "Email") {
                            TextField("john@email.com", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .formFieldStyle()
                        }

                        formField(label: "Phone") {
                            TextField("+1 555 123 4567", text: $phone)
                                .textContentType(.telephoneNumber)
                                .keyboardType(.phonePad)
                                .formFieldStyle()
                        }

                        formField(label: "Address") {
                            TextField("123 Main St, City, State", text: $address)
                                .textContentType(.fullStreetAddress)
                                .formFieldStyle()
                        }

                        prioritySection

                        insuranceSection

                        formField(label: "Care Specialty") {
                            Menu {
                                Button("Select specialty...") { primaryDiagnosis = "" }
                                ForEach(careSpecialties, id: \.self) { specialty in
                                    Button(specialty) { primaryDiagnosis = specialty }
                                }
                            } label: {
                                HStack {
                                    Text(primaryDiagnosis.isEmpty ? "Select specialty..." : primaryDiagnosis)
                                        .foregroundColor(primaryDiagnosis.isEmpty ? .palmSecondary : .palmText)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.palmSecondary)
                                }
                                .formFieldStyle()
                            }
                        }

                        formField(label: "Referral Notes") {
                            TextField("Referral source, special requirements...", text: $notes, axis: .vertical)
                                .lineLimit(2...4)
                                .formFieldStyle()
                        }
                    }
                    .padding(.horizontal, 20)

                    if let error = errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                            .padding(.horizontal, 20)
                    }

                    submitButton
                        .padding(.horizontal, 20)
                        .padding(.bottom, 30)
                }
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("Add Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    // MARK: - Header

    private var headerIcon: some View {
        VStack(spacing: 4) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color.palmPrimary, Color.palmAccent],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 56, height: 56)
                .overlay(
                    Image(systemName: "person.fill.badge.plus")
                        .font(.system(size: 22))
                        .foregroundColor(.white)
                )

            Text("New Client")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.palmText)
        }
    }

    // MARK: - Priority

    private var prioritySection: some View {
        formField(label: "Priority") {
            HStack(spacing: 8) {
                ForEach(priorityOptions, id: \.0) { value, label, color in
                    Button {
                        careLevel = careLevel == value ? "" : value
                    } label: {
                        HStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(color)
                                .frame(width: 3, height: 14)
                            Text(label)
                                .font(.system(size: 12, weight: .medium))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(
                            careLevel == value
                                ? color.opacity(0.1)
                                : Color.white
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(
                                    careLevel == value ? color : Color.palmBorder,
                                    lineWidth: 1
                                )
                        )
                        .cornerRadius(8)
                        .foregroundColor(careLevel == value ? color : .palmSecondary)
                    }
                }
            }
        }
    }

    // MARK: - Insurance

    private var insuranceSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            formField(label: "Insurance Type") {
                HStack(spacing: 8) {
                    insuranceButton("Medicaid", value: "medicaid", activeColor: Color.palmBlue)
                    insuranceButton("Medicare", value: "medicare", activeColor: Color.palmGreen)
                    insuranceButton("Private", value: "private", activeColor: Color.palmPurple)
                }
            }

            if insuranceType == "medicaid" {
                formField(label: "Medicaid ID") {
                    TextField("MCD123456789", text: $medicaidId)
                        .formFieldStyle()
                }
            }

            if insuranceType == "medicare" {
                formField(label: "Medicare ID") {
                    TextField("MCR123456789", text: $medicareId)
                        .formFieldStyle()
                }
            }

            if insuranceType == "private" {
                formField(label: "Insurance Provider") {
                    TextField("Blue Cross Blue Shield", text: $insuranceProvider)
                        .formFieldStyle()
                }
            }
        }
    }

    private func insuranceButton(_ label: String, value: String, activeColor: Color) -> some View {
        Button {
            insuranceType = insuranceType == value ? "" : value
        } label: {
            Text(label)
                .font(.system(size: 13, weight: .medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(
                    insuranceType == value
                        ? activeColor.opacity(0.1)
                        : Color.white
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(
                            insuranceType == value ? activeColor : Color.palmBorder,
                            lineWidth: 1
                        )
                )
                .cornerRadius(8)
                .foregroundColor(insuranceType == value ? activeColor : .palmSecondary)
        }
    }

    // MARK: - Submit

    private var submitButton: some View {
        Button { Task { await createClient() } } label: {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView().tint(.white).scaleEffect(0.8)
                } else {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .bold))
                }
                Text(isLoading ? "Adding..." : "Add Client")
                    .font(.system(size: 15, weight: .bold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    colors: [Color.palmPrimary, Color.palmTeal600],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .opacity(canSubmit ? 1 : 0.5)
            )
            .cornerRadius(12)
        }
        .disabled(!canSubmit || isLoading)
    }

    // MARK: - Helpers

    private var canSubmit: Bool {
        !fullName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    @ViewBuilder
    private func formField<Content: View>(label: String, required: Bool = false, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.palmSecondary)
                if required {
                    Text("*")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.red)
                }
            }
            content()
        }
    }

    private func createClient() async {
        isLoading = true
        errorMessage = nil

        var body: [String: Any] = [
            "full_name": fullName.trimmingCharacters(in: .whitespaces),
            "status": "intake"
        ]
        if !phone.isEmpty { body["phone"] = phone }
        if !email.isEmpty { body["email"] = email }
        if !address.isEmpty { body["address"] = address }
        if !careLevel.isEmpty { body["care_level"] = careLevel }
        if !primaryDiagnosis.isEmpty { body["primary_diagnosis"] = primaryDiagnosis }
        if !notes.isEmpty { body["notes"] = notes }

        if insuranceType == "medicaid" {
            body["medicaid_id"] = medicaidId.isEmpty ? "PENDING" : medicaidId
        } else if insuranceType == "medicare" {
            body["medicare_id"] = medicareId.isEmpty ? "PENDING" : medicareId
        } else if insuranceType == "private" {
            body["insurance_provider"] = insuranceProvider.isEmpty ? "Private Insurance" : insuranceProvider
        }

        do {
            let client = try await api.createClient(body: body)
            await MainActor.run {
                isLoading = false
                onClientCreated?(client)
                dismiss()
            }
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Form Field Style

extension View {
    func formFieldStyle() -> some View {
        self
            .font(.system(size: 14))
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.white)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.palmBorder, lineWidth: 1)
            )
    }
}
