import SwiftUI

extension ClientDetailView {
    // MARK: - Profile Card

    var profileCard: some View {
        VStack(spacing: 16) {
            ClientAvatar(name: client.full_name, size: 72)

            VStack(spacing: 6) {
                Text(client.full_name)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.palmText)

                if let preferred = client.preferred_name, !preferred.isEmpty {
                    Text("\"\(preferred)\"")
                        .font(.system(size: 13))
                        .foregroundColor(.palmSecondary)
                }

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    Text(diagnosis.replacingOccurrences(of: "_", with: " ").capitalized)
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
                        Text(careLevel.capitalized)
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
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 6, y: 3)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.palmBorder, lineWidth: 1))
    }

    func actionButton(icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
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
        .accessibilityLabel(label)
    }

    // MARK: - Contact Section

    var contactSection: some View {
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

    var emergencySection: some View {
        DetailSection(title: "Emergency Contacts", icon: "exclamationmark.shield.fill", iconColor: .red) {
            VStack(spacing: 0) {
                if let ecName = client.emergency_contact_name, !ecName.isEmpty {
                    emergencyContactCard(
                        label: "Primary Contact",
                        name: ecName,
                        phone: client.emergency_contact_phone,
                        relationship: client.emergency_contact_relationship,
                        color: .red
                    )
                }
                if let ec2Name = client.emergency_contact_2_name, !ec2Name.isEmpty {
                    detailDivider
                    emergencyContactCard(
                        label: "Secondary Contact",
                        name: ec2Name,
                        phone: client.emergency_contact_2_phone,
                        relationship: client.emergency_contact_2_relationship,
                        color: .palmOrange
                    )
                }
            }
        }
    }

    func emergencyContactCard(label: String, name: String, phone: String?, relationship: String?, color: Color) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "person.crop.circle.badge.exclamationmark.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(color)
                .frame(width: 30, height: 30)
                .background(color.opacity(0.1))
                .cornerRadius(8)

            VStack(alignment: .leading, spacing: 6) {
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.palmSecondary)

                Text(name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)

                HStack(spacing: 12) {
                    if let phone = phone, !phone.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.palmPrimary)
                            Text(phone)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.palmText.opacity(0.8))
                        }
                    }
                    if let rel = relationship, !rel.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.palmPurple)
                            Text(rel)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.palmText.opacity(0.8))
                        }
                    }
                }
            }

            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    // MARK: - Medical Section

    var medicalSection: some View {
        DetailSection(title: "Medical", icon: "heart.fill", iconColor: .red) {
            VStack(spacing: 0) {
                var showDivider = false

                if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                    detailRow(icon: "stethoscope", label: "Primary Diagnosis", value: diagnosis.replacingOccurrences(of: "_", with: " ").capitalized, color: .palmPrimary)
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
                    medicalNotesView(medNotes)
                }
            }
        }
    }

    // MARK: - Care Plan Section

    var careSection: some View {
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

    var insuranceSection: some View {
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

    var schedulingSection: some View {
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

    var notesSection: some View {
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

    var visitsSection: some View {
        DetailSection(title: "Visits (\(clientVisits.count))", icon: "clock.arrow.circlepath", iconColor: .palmPrimary) {
            if isLoading {
                HStack { Spacer(); ProgressView(); Spacer() }
                    .padding(.vertical, 20)
            } else if loadError != nil {
                visitsErrorView
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
                        NavigationLink(destination:
                            VisitDetailView(
                                visitId: visit.id,
                                clientName: client.full_name
                            ).environmentObject(api)
                        ) {
                            visitRow(visit)
                        }
                        .accessibilityLabel("\(client.full_name), Assessment \(formattedDate(visit.created_at))")
                        .buttonStyle(.plain)
                        if index < clientVisits.count - 1 {
                            Divider().padding(.leading, 54)
                        }
                    }
                }
            }
        }
    }

}
