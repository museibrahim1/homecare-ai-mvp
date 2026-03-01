import SwiftUI

struct AddClientSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    var onClientCreated: ((Client) -> Void)?

    @State private var fullName = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var primaryDiagnosis = ""
    @State private var address = ""
    @State private var dateOfBirth = ""
    @State private var gender = ""

    @State private var isLoading = false
    @State private var errorMessage: String?

    private let genders = ["", "Male", "Female", "Other"]

    var body: some View {
        NavigationStack {
            Form {
                Section {
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
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                }

                Section("Basic Information") {
                    TextField("Full Name *", text: $fullName)
                        .textContentType(.name)
                    TextField("Phone", text: $phone)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    Picker("Gender", selection: $gender) {
                        ForEach(genders, id: \.self) { g in
                            Text(g.isEmpty ? "Select" : g).tag(g)
                        }
                    }
                }

                Section("Medical") {
                    TextField("Primary Diagnosis", text: $primaryDiagnosis)
                }

                Section("Address") {
                    TextField("Address", text: $address)
                        .textContentType(.fullStreetAddress)
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                    }
                }

                Section {
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
                        .padding(.vertical, 12)
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
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("Add Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private var canSubmit: Bool {
        !fullName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func createClient() async {
        isLoading = true
        errorMessage = nil

        var body: [String: Any] = ["full_name": fullName.trimmingCharacters(in: .whitespaces)]
        if !phone.isEmpty { body["phone"] = phone }
        if !email.isEmpty { body["email"] = email }
        if !primaryDiagnosis.isEmpty { body["primary_diagnosis"] = primaryDiagnosis }
        if !address.isEmpty { body["address"] = address }
        if !gender.isEmpty { body["gender"] = gender.lowercased() }
        if !dateOfBirth.isEmpty { body["date_of_birth"] = dateOfBirth }

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
