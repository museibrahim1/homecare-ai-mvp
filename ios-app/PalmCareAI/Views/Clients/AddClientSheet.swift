import SwiftUI

// MARK: - Add/Edit Client Sheet (matches web app 8-tab form)

struct AddClientSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    var editingClient: Client?
    var onClientCreated: ((Client) -> Void)?

    // Personal
    @State private var fullName = ""
    @State private var preferredName = ""
    @State private var dateOfBirth = ""
    @State private var gender = ""
    @State private var status = "active"
    @State private var intakeDate = ""
    @State private var notes = ""

    // Contact
    @State private var phone = ""
    @State private var phoneSecondary = ""
    @State private var email = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = ""
    @State private var zipCode = ""

    // Emergency
    @State private var ecName = ""
    @State private var ecPhone = ""
    @State private var ecRelationship = ""
    @State private var ec2Name = ""
    @State private var ec2Phone = ""
    @State private var ec2Relationship = ""

    // Medical
    @State private var primaryDiagnosis = ""
    @State private var secondaryDiagnoses = ""
    @State private var allergies = ""
    @State private var medications = ""
    @State private var physicianName = ""
    @State private var physicianPhone = ""
    @State private var mobilityStatus = ""
    @State private var cognitiveStatus = ""
    @State private var medicalNotes = ""

    // Care Plan
    @State private var careLevel = ""
    @State private var livingSituation = ""
    @State private var carePlan = ""
    @State private var specialRequirements = ""

    // Insurance
    @State private var insuranceProvider = ""
    @State private var insuranceId = ""
    @State private var medicaidId = ""
    @State private var medicareId = ""
    @State private var billingAddress = ""

    // Scheduling
    @State private var preferredDays = ""
    @State private var preferredTimes = ""
    @State private var dischargeDate = ""
    @State private var externalId = ""
    @State private var externalSource = ""

    @State private var activeTab = 0
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let tabs = ["Personal", "Contact", "Emergency", "Medical", "Care Plan", "Insurance", "Scheduling"]

    private var isEditing: Bool { editingClient != nil }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                tabBar
                tabContent
                footer
            }
            .background(Color.palmBackground)
            .navigationTitle(isEditing ? "Edit Client" : "Add Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.palmPrimary)
                }
            }
            .onAppear { populateFromClient() }
        }
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 4) {
                ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { activeTab = index }
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: tabIcon(index))
                                .font(.system(size: 11, weight: .semibold))
                            Text(tab)
                                .font(.system(size: 12, weight: .medium))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(activeTab == index ? Color.palmPrimary : Color.clear)
                        .foregroundColor(activeTab == index ? .white : .palmSecondary)
                        .cornerRadius(8)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .background(Color.white)
        .overlay(Divider(), alignment: .bottom)
    }

    private func tabIcon(_ index: Int) -> String {
        switch index {
        case 0: return "person.fill"
        case 1: return "phone.fill"
        case 2: return "exclamationmark.shield.fill"
        case 3: return "heart.fill"
        case 4: return "doc.text.fill"
        case 5: return "shield.fill"
        case 6: return "calendar"
        default: return "circle"
        }
    }

    // MARK: - Tab Content

    private var tabContent: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                switch activeTab {
                case 0: personalTab
                case 1: contactTab
                case 2: emergencyTab
                case 3: medicalTab
                case 4: careTab
                case 5: insuranceTab
                case 6: schedulingTab
                default: EmptyView()
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
        }
    }

    // MARK: - Personal Tab

    private var personalTab: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                formField("Full Name *", text: $fullName, placeholder: "John Smith", contentType: .name)
                formField("Preferred Name", text: $preferredName, placeholder: "Johnny", contentType: .name)
            }

            HStack(spacing: 12) {
                formField("Date of Birth", text: $dateOfBirth, placeholder: "MM/DD/YYYY")
                pickerField("Gender", selection: $gender, options: [
                    ("male", "Male"), ("female", "Female"), ("other", "Other"), ("prefer_not_to_say", "Prefer not to say")
                ])
            }

            HStack(spacing: 12) {
                pickerField("Status", selection: $status, options: [
                    ("active", "Active"), ("inactive", "Inactive"), ("pending", "Pending"), ("discharged", "Discharged"), ("intake", "Intake")
                ])
                formField("Intake Date", text: $intakeDate, placeholder: "MM/DD/YYYY")
            }

            textAreaField("General Notes", text: $notes, placeholder: "Any general notes about this client...")
        }
    }

    // MARK: - Contact Tab

    private var contactTab: some View {
        VStack(spacing: 14) {
            sectionHeader("Phone Numbers", icon: "phone.fill", color: .palmPrimary)

            HStack(spacing: 12) {
                formField("Primary Phone", text: $phone, placeholder: "(555) 123-4567", contentType: .telephoneNumber, keyboard: .phonePad)
                formField("Secondary Phone", text: $phoneSecondary, placeholder: "(555) 987-6543", contentType: .telephoneNumber, keyboard: .phonePad)
            }

            sectionHeader("Email", icon: "envelope.fill", color: .palmBlue)
            formField("Email Address", text: $email, placeholder: "john@example.com", contentType: .emailAddress, keyboard: .emailAddress)

            sectionHeader("Address", icon: "house.fill", color: .palmOrange)
            formField("Street Address", text: $address, placeholder: "123 Main Street, Apt 4B", contentType: .fullStreetAddress)

            HStack(spacing: 12) {
                formField("City", text: $city, placeholder: "Lincoln", contentType: .addressCity)
                formField("State", text: $state, placeholder: "NE", contentType: .addressState)
                formField("ZIP Code", text: $zipCode, placeholder: "68501", contentType: .postalCode, keyboard: .numberPad)
            }
        }
    }

    // MARK: - Emergency Tab

    private var emergencyTab: some View {
        VStack(spacing: 14) {
            sectionHeader("Primary Emergency Contact", icon: "exclamationmark.shield.fill", color: .red)

            formField("Full Name", text: $ecName, placeholder: "Jane Smith", contentType: .name)
            HStack(spacing: 12) {
                formField("Phone Number", text: $ecPhone, placeholder: "(555) 999-8888", contentType: .telephoneNumber, keyboard: .phonePad)
                formField("Relationship", text: $ecRelationship, placeholder: "Daughter")
            }

            sectionHeader("Secondary Emergency Contact", icon: "exclamationmark.shield", color: .palmOrange)

            formField("Full Name", text: $ec2Name, placeholder: "Bob Smith", contentType: .name)
            HStack(spacing: 12) {
                formField("Phone Number", text: $ec2Phone, placeholder: "(555) 888-7777", contentType: .telephoneNumber, keyboard: .phonePad)
                formField("Relationship", text: $ec2Relationship, placeholder: "Son")
            }

            HStack(spacing: 8) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.palmPrimary)
                Text("Emergency contacts will be notified in case of medical emergencies or if the client cannot be reached.")
                    .font(.system(size: 12))
                    .foregroundColor(.palmSecondary)
            }
            .padding(12)
            .background(Color.palmPrimary.opacity(0.05))
            .cornerRadius(10)
        }
    }

    // MARK: - Medical Tab

    private var medicalTab: some View {
        VStack(spacing: 14) {
            sectionHeader("Diagnoses", icon: "heart.fill", color: .red)

            formField("Primary Diagnosis", text: $primaryDiagnosis, placeholder: "Type 2 Diabetes")
            formField("Secondary Diagnoses", text: $secondaryDiagnoses, placeholder: "Hypertension, Arthritis, COPD")

            HStack(spacing: 12) {
                textAreaField("Allergies", text: $allergies, placeholder: "Penicillin, Shellfish, Latex...", lines: 2)
                textAreaField("Current Medications", text: $medications, placeholder: "Metformin 500mg, Lisinopril 10mg...", lines: 2)
            }

            sectionHeader("Primary Care Physician", icon: "stethoscope", color: .palmPrimary)

            HStack(spacing: 12) {
                formField("Physician Name", text: $physicianName, placeholder: "Dr. Sarah Johnson")
                formField("Physician Phone", text: $physicianPhone, placeholder: "(555) 000-1111", keyboard: .phonePad)
            }

            sectionHeader("Physical & Cognitive Status", icon: "figure.walk", color: .palmPurple)

            HStack(spacing: 12) {
                pickerField("Mobility Status", selection: $mobilityStatus, options: [
                    ("independent", "Independent"), ("uses_cane", "Uses Cane"), ("uses_walker", "Uses Walker"),
                    ("uses_wheelchair", "Uses Wheelchair"), ("bedridden", "Bedridden")
                ])
                pickerField("Cognitive Status", selection: $cognitiveStatus, options: [
                    ("intact", "Intact"), ("mild_impairment", "Mild Impairment"),
                    ("moderate_impairment", "Moderate Impairment"), ("severe_impairment", "Severe Impairment")
                ])
            }

            textAreaField("Additional Medical Notes", text: $medicalNotes, placeholder: "Additional medical history, precautions, or important information...", lines: 4)
        }
    }

    // MARK: - Care Tab

    private var careTab: some View {
        VStack(spacing: 14) {
            sectionHeader("Care Requirements", icon: "doc.text.fill", color: .palmPrimary)

            HStack(spacing: 12) {
                pickerField("Care Level", selection: $careLevel, options: [
                    ("LOW", "Low - Companionship"), ("MODERATE", "Moderate - Daily Living"), ("HIGH", "High - Skilled/Medical")
                ])
                pickerField("Living Situation", selection: $livingSituation, options: [
                    ("lives_alone", "Lives Alone"), ("lives_with_spouse", "Lives with Spouse"),
                    ("lives_with_family", "Lives with Family"), ("assisted_living", "Assisted Living"),
                    ("nursing_home", "Nursing Home")
                ])
            }

            textAreaField("Care Plan Details", text: $carePlan, placeholder: "Describe the care plan, daily routines, and specific care goals...", lines: 5)
            textAreaField("Special Requirements", text: $specialRequirements, placeholder: "Any special needs, dietary restrictions, religious considerations, preferences...", lines: 4)
        }
    }

    // MARK: - Insurance Tab

    private var insuranceTab: some View {
        VStack(spacing: 14) {
            sectionHeader("Primary Insurance", icon: "shield.fill", color: .palmPrimary)

            HStack(spacing: 12) {
                formField("Insurance Provider", text: $insuranceProvider, placeholder: "Blue Cross Blue Shield")
                formField("Policy Number", text: $insuranceId, placeholder: "XYZ123456789")
            }

            sectionHeader("Government Programs", icon: "creditcard.fill", color: .palmGreen)

            HStack(spacing: 12) {
                formField("Medicaid ID", text: $medicaidId, placeholder: "MCD987654321")
                formField("Medicare ID", text: $medicareId, placeholder: "MCR123456789")
            }

            sectionHeader("Billing Address", icon: "mappin.circle.fill", color: .palmOrange)
            textAreaField("Billing Address (if different from home)", text: $billingAddress, placeholder: "123 Billing St, City, State ZIP", lines: 2)
        }
    }

    // MARK: - Scheduling Tab

    private var schedulingTab: some View {
        VStack(spacing: 14) {
            sectionHeader("Scheduling Preferences", icon: "calendar", color: .palmPrimary)

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    formField("Preferred Days", text: $preferredDays, placeholder: "Monday, Wednesday, Friday")
                    Text("Days when care visits are preferred")
                        .font(.system(size: 10))
                        .foregroundColor(.palmSecondary)
                }
                VStack(alignment: .leading, spacing: 4) {
                    formField("Preferred Times", text: $preferredTimes, placeholder: "9:00 AM - 1:00 PM")
                    Text("Time slots when visits are preferred")
                        .font(.system(size: 10))
                        .foregroundColor(.palmSecondary)
                }
            }

            sectionHeader("Important Dates", icon: "clock.fill", color: .palmBlue)

            HStack(spacing: 12) {
                formField("Intake Date", text: $intakeDate, placeholder: "MM/DD/YYYY")
                formField("Discharge Date", text: $dischargeDate, placeholder: "MM/DD/YYYY")
            }

            sectionHeader("External System", icon: "building.2.fill", color: .palmPurple)

            HStack(spacing: 12) {
                formField("External ID", text: $externalId, placeholder: "CRM-12345")
                pickerField("External Source", selection: $externalSource, options: [
                    ("monday", "Monday.com"), ("salesforce", "Salesforce"), ("hubspot", "HubSpot"),
                    ("csv", "CSV Import"), ("manual", "Manual Entry")
                ])
            }
        }
    }

    // MARK: - Footer

    private var footer: some View {
        VStack(spacing: 0) {
            Divider()

            if let error = errorMessage {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundColor(.red)
                    .padding(.horizontal, 18)
                    .padding(.top, 8)
            }

            HStack(spacing: 12) {
                if activeTab > 0 {
                    Button {
                        withAnimation { activeTab -= 1 }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 11, weight: .bold))
                            Text("Back")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundColor(.palmSecondary)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(Color.white)
                        .cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                    }
                }

                Spacer()

                if activeTab < tabs.count - 1 {
                    Button {
                        withAnimation { activeTab += 1 }
                    } label: {
                        HStack(spacing: 4) {
                            Text("Next")
                                .font(.system(size: 14, weight: .semibold))
                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(Color.palmPrimary)
                        .cornerRadius(10)
                    }
                }

                Button { Task { await saveClient() } } label: {
                    HStack(spacing: 6) {
                        if isLoading {
                            ProgressView().tint(.white).scaleEffect(0.8)
                        } else {
                            Image(systemName: isEditing ? "checkmark" : "plus")
                                .font(.system(size: 12, weight: .bold))
                        }
                        Text(isLoading ? "Saving..." : (isEditing ? "Save" : "Add Client"))
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(colors: [.palmPrimary, .palmTeal600], startPoint: .leading, endPoint: .trailing)
                            .opacity(canSubmit ? 1 : 0.5)
                    )
                    .cornerRadius(10)
                }
                .disabled(!canSubmit || isLoading)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
        }
        .background(Color.white)
    }

    // MARK: - Field Components

    private func formField(_ label: String, text: Binding<String>, placeholder: String,
                           contentType: UITextContentType? = nil, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.palmSecondary)
            TextField(placeholder, text: text)
                .font(.system(size: 14))
                .foregroundColor(.palmText)
                .keyboardType(keyboard)
                .textContentType(contentType)
                .autocapitalization(keyboard == .emailAddress ? .none : .words)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white)
                .cornerRadius(10)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    private func textAreaField(_ label: String, text: Binding<String>, placeholder: String, lines: Int = 3) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.palmSecondary)
            TextField(placeholder, text: text, axis: .vertical)
                .font(.system(size: 14))
                .foregroundColor(.palmText)
                .lineLimit(lines...lines + 2)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white)
                .cornerRadius(10)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    private func pickerField(_ label: String, selection: Binding<String>, options: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.palmSecondary)
            Menu {
                Button("Select...") { selection.wrappedValue = "" }
                ForEach(options, id: \.0) { value, display in
                    Button(display) { selection.wrappedValue = value }
                }
            } label: {
                HStack {
                    Text(options.first(where: { $0.0 == selection.wrappedValue })?.1 ?? "Select...")
                        .font(.system(size: 14))
                        .foregroundColor(selection.wrappedValue.isEmpty ? .palmSecondary : .palmText)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmSecondary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white)
                .cornerRadius(10)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
            }
        }
    }

    private func sectionHeader(_ title: String, icon: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(color)
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmText)
            Spacer()
        }
        .padding(.top, 4)
    }

    // MARK: - Logic

    private var canSubmit: Bool {
        !fullName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func populateFromClient() {
        guard let c = editingClient else { return }
        fullName = c.full_name
        preferredName = c.preferred_name ?? ""
        dateOfBirth = c.date_of_birth ?? ""
        gender = c.gender ?? ""
        status = c.status ?? "active"
        phone = c.phone ?? ""
        phoneSecondary = c.phone_secondary ?? ""
        email = c.email ?? ""
        address = c.address ?? ""
        city = c.city ?? ""
        state = c.state ?? ""
        zipCode = c.zip_code ?? ""
        ecName = c.emergency_contact_name ?? ""
        ecPhone = c.emergency_contact_phone ?? ""
        ecRelationship = c.emergency_contact_relationship ?? ""
        ec2Name = c.emergency_contact_2_name ?? ""
        ec2Phone = c.emergency_contact_2_phone ?? ""
        ec2Relationship = c.emergency_contact_2_relationship ?? ""
        primaryDiagnosis = c.primary_diagnosis ?? ""
        secondaryDiagnoses = c.secondary_diagnoses ?? ""
        allergies = c.allergies ?? ""
        medications = c.medications ?? ""
        physicianName = c.physician_name ?? ""
        physicianPhone = c.physician_phone ?? ""
        mobilityStatus = c.mobility_status ?? ""
        cognitiveStatus = c.cognitive_status ?? ""
        medicalNotes = c.medical_notes ?? ""
        careLevel = c.care_level ?? ""
        livingSituation = c.living_situation ?? ""
        carePlan = c.care_plan ?? ""
        specialRequirements = c.special_requirements ?? ""
        insuranceProvider = c.insurance_provider ?? ""
        insuranceId = c.insurance_id ?? ""
        medicaidId = c.medicaid_id ?? ""
        medicareId = c.medicare_id ?? ""
        billingAddress = c.billing_address ?? ""
        preferredDays = c.preferred_days ?? ""
        preferredTimes = c.preferred_times ?? ""
        intakeDate = c.intake_date ?? ""
        dischargeDate = c.discharge_date ?? ""
        notes = c.notes ?? ""
        externalId = c.external_id ?? ""
        externalSource = c.external_source ?? ""
    }

    private func buildBody() -> [String: Any] {
        var body: [String: Any] = ["full_name": fullName.trimmingCharacters(in: .whitespaces)]

        let fields: [(String, String)] = [
            ("preferred_name", preferredName), ("date_of_birth", dateOfBirth), ("gender", gender),
            ("status", status), ("phone", phone), ("phone_secondary", phoneSecondary),
            ("email", email), ("address", address), ("city", city), ("state", state), ("zip_code", zipCode),
            ("emergency_contact_name", ecName), ("emergency_contact_phone", ecPhone),
            ("emergency_contact_relationship", ecRelationship),
            ("emergency_contact_2_name", ec2Name), ("emergency_contact_2_phone", ec2Phone),
            ("emergency_contact_2_relationship", ec2Relationship),
            ("primary_diagnosis", primaryDiagnosis), ("secondary_diagnoses", secondaryDiagnoses),
            ("allergies", allergies), ("medications", medications),
            ("physician_name", physicianName), ("physician_phone", physicianPhone),
            ("medical_notes", medicalNotes), ("mobility_status", mobilityStatus),
            ("cognitive_status", cognitiveStatus), ("living_situation", livingSituation),
            ("care_level", careLevel), ("care_plan", carePlan), ("special_requirements", specialRequirements),
            ("insurance_provider", insuranceProvider), ("insurance_id", insuranceId),
            ("medicaid_id", medicaidId), ("medicare_id", medicareId), ("billing_address", billingAddress),
            ("preferred_days", preferredDays), ("preferred_times", preferredTimes),
            ("intake_date", intakeDate), ("discharge_date", dischargeDate),
            ("notes", notes), ("external_id", externalId), ("external_source", externalSource),
        ]

        for (key, value) in fields {
            let trimmed = value.trimmingCharacters(in: .whitespaces)
            if !trimmed.isEmpty {
                body[key] = trimmed
            }
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
            .background(Color.white)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.palmBorder, lineWidth: 1)
            )
    }
}
