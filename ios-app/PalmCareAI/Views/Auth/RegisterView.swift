import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    @State private var fullName = ""
    @State private var businessName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var stateCode = ""
    @State private var zipCode = ""
    @State private var streetAddress = ""
    @State private var city = ""

    @State private var showPassword = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showStatePicker = false
    @FocusState private var focusedField: Field?

    private enum Field: Hashable {
        case fullName, businessName, email, phone, password
        case street, city, zip
    }

    private var passwordIsStrong: Bool {
        password.count >= 8
    }

    private var formIsValid: Bool {
        !fullName.isEmpty && isEmailValid && !phone.isEmpty
            && passwordIsStrong && !stateCode.isEmpty && zipCode.count == 5
    }

    private var isEmailValid: Bool {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.contains("@") && trimmed.contains(".") && trimmed.count > 5
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                header
                    .padding(.top, 8)
                    .padding(.bottom, 24)

                VStack(spacing: 28) {
                    section(title: "Your Info") {
                        textField(
                            icon: "person",
                            placeholder: "Full name",
                            text: $fullName,
                            keyboard: .default,
                            contentType: .name,
                            focus: .fullName,
                            next: .email
                        )

                        textField(
                            icon: "envelope",
                            placeholder: "Email",
                            text: $email,
                            keyboard: .emailAddress,
                            contentType: .emailAddress,
                            focus: .email,
                            next: .phone
                        )

                        textField(
                            icon: "phone",
                            placeholder: "Phone",
                            text: $phone,
                            keyboard: .phonePad,
                            contentType: .telephoneNumber,
                            focus: .phone,
                            next: .password,
                            formatHint: phone.isEmpty ? nil : phoneFormatted
                        )

                        passwordField
                    }

                    section(title: "Your Agency") {
                        textField(
                            icon: "building.2",
                            placeholder: "Agency name (optional)",
                            text: $businessName,
                            keyboard: .default,
                            contentType: .organizationName,
                            focus: .businessName,
                            next: .street
                        )

                        textField(
                            icon: "location",
                            placeholder: "Street address (optional)",
                            text: $streetAddress,
                            keyboard: .default,
                            contentType: .streetAddressLine1,
                            focus: .street,
                            next: .city
                        )

                        textField(
                            icon: "building",
                            placeholder: "City (optional)",
                            text: $city,
                            keyboard: .default,
                            contentType: .addressCity,
                            focus: .city,
                            next: .zip
                        )

                        HStack(spacing: 12) {
                            statePicker
                            zipField
                        }

                        Text("State & ZIP are used to apply the correct home-care regulations and Medicaid rates to your contracts.")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                            .padding(.top, 4)
                    }

                    createButton

                    bottomLink
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color(UIColor.systemBackground))
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
        .palmErrorAlert("Registration Failed", message: $errorMessage, isPresented: $showError)
        .sheet(isPresented: $showStatePicker) {
            StatePickerSheet(selectedState: $stateCode)
        }
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(LinearGradient.palmPrimary)
                    .frame(width: 60, height: 60)
                    .shadow(color: Color.palmPrimary.opacity(0.3), radius: 8, y: 3)

                Image(systemName: "waveform")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(.white)
            }

            VStack(spacing: 4) {
                Text("Get started with PalmCare AI")
                    .font(.system(size: 22, weight: .bold))
                    .multilineTextAlignment(.center)
                Text("Record care visits, generate compliant contracts.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 24)
    }

    private func section<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondary)
                .tracking(0.6)
                .padding(.leading, 4)

            VStack(spacing: 10) {
                content()
            }
        }
    }

    private func textField(
        icon: String,
        placeholder: String,
        text: Binding<String>,
        keyboard: UIKeyboardType,
        contentType: UITextContentType?,
        focus: Field,
        next: Field?,
        formatHint: String? = nil
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 17))
                .foregroundColor(.secondary)
                .frame(width: 22)

            TextField(placeholder, text: text)
                .font(.body)
                .keyboardType(keyboard)
                .textContentType(contentType)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : autocapForKeyboard(keyboard))
                .autocorrectionDisabled(keyboard == .emailAddress || keyboard == .phonePad)
                .submitLabel(next == nil ? .done : .next)
                .focused($focusedField, equals: focus)
                .onSubmit { focusedField = next }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(Color(UIColor.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(focusedField == focus ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
        )
    }

    private var passwordField: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 12) {
                Image(systemName: "lock")
                    .font(.system(size: 17))
                    .foregroundColor(.secondary)
                    .frame(width: 22)

                Group {
                    if showPassword {
                        TextField("Password (at least 8 characters)", text: $password)
                            .textContentType(.newPassword)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    } else {
                        SecureField("Password (at least 8 characters)", text: $password)
                            .textContentType(.newPassword)
                    }
                }
                .font(.body)
                .focused($focusedField, equals: .password)

                Button { showPassword.toggle() } label: {
                    Image(systemName: showPassword ? "eye.slash" : "eye")
                        .font(.system(size: 17))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Color(UIColor.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(focusedField == .password ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
            )

            if !password.isEmpty && !passwordIsStrong {
                Label("Password must be at least 8 characters", systemImage: "info.circle")
                    .font(.footnote)
                    .foregroundColor(.orange)
            }
        }
    }

    private var statePicker: some View {
        Button { showStatePicker = true } label: {
            HStack(spacing: 12) {
                Image(systemName: "map")
                    .font(.system(size: 17))
                    .foregroundColor(.secondary)
                    .frame(width: 22)

                Text(stateCode.isEmpty ? "State" : stateCode)
                    .font(.body)
                    .foregroundColor(stateCode.isEmpty ? .secondary : .primary)

                Spacer()

                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Color(UIColor.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var zipField: some View {
        HStack(spacing: 12) {
            Image(systemName: "mappin")
                .font(.system(size: 17))
                .foregroundColor(.secondary)
                .frame(width: 22)

            TextField("ZIP", text: $zipCode)
                .font(.body)
                .keyboardType(.numberPad)
                .textContentType(.postalCode)
                .focused($focusedField, equals: .zip)
                .onChange(of: zipCode) { newValue in
                    if newValue.count > 5 {
                        zipCode = String(newValue.prefix(5))
                    }
                }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
        .background(Color(UIColor.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(focusedField == .zip ? Color.palmPrimary.opacity(0.5) : Color.clear, lineWidth: 1.5)
        )
    }

    private var createButton: some View {
        Button(action: performRegister) {
            ZStack {
                Text("Create Account")
                    .font(.headline)
                    .foregroundColor(.white)
                    .opacity(isLoading ? 0 : 1)
                if isLoading {
                    ProgressView().tint(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(formIsValid ? Color.palmPrimary : Color.palmPrimary.opacity(0.4))
            )
        }
        .disabled(!formIsValid || isLoading)
        .accessibilityIdentifier("createAccountButton")
    }

    private var bottomLink: some View {
        VStack(spacing: 14) {
            HStack(spacing: 4) {
                Text("Already have an account?")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Button { dismiss() } label: {
                    Text("Sign in")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.palmPrimary)
                }
            }

            Text("By tapping Create Account, you agree to PalmCare AI's Terms of Service and Privacy Policy.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
        }
    }

    // MARK: - Helpers

    private var phoneFormatted: String {
        let digits = phone.filter(\.isNumber)
        return digits
    }

    private func autocapForKeyboard(_ k: UIKeyboardType) -> TextInputAutocapitalization {
        switch k {
        case .emailAddress, .URL: return .never
        case .phonePad, .numberPad, .decimalPad: return .never
        default: return .words
        }
    }

    private func performRegister() {
        focusedField = nil
        isLoading = true
        errorMessage = nil

        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedFullName = fullName.trimmingCharacters(in: .whitespacesAndNewlines)
        let agencyName = businessName.trimmingCharacters(in: .whitespacesAndNewlines)

        let body: [String: Any] = [
            "name": agencyName.isEmpty ? trimmedFullName : agencyName,
            "entity_type": "llc",
            "state_of_incorporation": stateCode,
            "address": streetAddress,
            "city": city,
            "state": stateCode,
            "zip_code": zipCode,
            "phone": trimmedPhone,
            "email": trimmedEmail,
            "owner_name": trimmedFullName,
            "owner_email": trimmedEmail,
            "owner_password": password,
        ]

        Task {
            do {
                try await api.register(body: body)
                let loginResponse = try await api.login(email: trimmedEmail, password: password)
                await MainActor.run {
                    if let token = loginResponse.access_token {
                        api.token = token
                    }
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showError = true
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - State Picker Sheet

struct StatePickerSheet: View {
    @Binding var selectedState: String
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    private static let states: [(String, String)] = [
        ("AL","Alabama"),("AK","Alaska"),("AZ","Arizona"),("AR","Arkansas"),("CA","California"),
        ("CO","Colorado"),("CT","Connecticut"),("DE","Delaware"),("DC","D.C."),("FL","Florida"),
        ("GA","Georgia"),("HI","Hawaii"),("ID","Idaho"),("IL","Illinois"),("IN","Indiana"),
        ("IA","Iowa"),("KS","Kansas"),("KY","Kentucky"),("LA","Louisiana"),("ME","Maine"),
        ("MD","Maryland"),("MA","Massachusetts"),("MI","Michigan"),("MN","Minnesota"),("MS","Mississippi"),
        ("MO","Missouri"),("MT","Montana"),("NE","Nebraska"),("NV","Nevada"),("NH","New Hampshire"),
        ("NJ","New Jersey"),("NM","New Mexico"),("NY","New York"),("NC","North Carolina"),("ND","North Dakota"),
        ("OH","Ohio"),("OK","Oklahoma"),("OR","Oregon"),("PA","Pennsylvania"),("RI","Rhode Island"),
        ("SC","South Carolina"),("SD","South Dakota"),("TN","Tennessee"),("TX","Texas"),("UT","Utah"),
        ("VT","Vermont"),("VA","Virginia"),("WA","Washington"),("WV","West Virginia"),("WI","Wisconsin"),
        ("WY","Wyoming"),
    ]

    private var filtered: [(String, String)] {
        guard !search.isEmpty else { return Self.states }
        return Self.states.filter { code, name in
            code.localizedCaseInsensitiveContains(search) || name.localizedCaseInsensitiveContains(search)
        }
    }

    var body: some View {
        NavigationStack {
            List(filtered, id: \.0) { code, name in
                Button {
                    selectedState = code
                    dismiss()
                } label: {
                    HStack {
                        Text(name)
                            .foregroundColor(.primary)
                        Spacer()
                        Text(code)
                            .foregroundColor(.secondary)
                            .font(.subheadline.monospaced())
                        if selectedState == code {
                            Image(systemName: "checkmark")
                                .foregroundColor(.palmPrimary)
                                .padding(.leading, 4)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search")
            .navigationTitle("Select State")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView()
            .environmentObject(APIService.shared)
    }
}
