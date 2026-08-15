import SwiftUI

extension VisitDetailView {
    var notesTab: some View {
        VStack(spacing: 14) {
            if let n = note {
                HStack {
                    Text("Clinical Notes (SOAP)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.palmText)
                    Spacer()

                    if isEditingNote {
                        Button {
                            Task { await saveNoteEdits() }
                        } label: {
                            HStack(spacing: 4) {
                                if isSavingNote {
                                    ProgressView().scaleEffect(0.6).tint(.palmPrimary)
                                }
                                Text("Save").font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundColor(.palmPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.palmPrimary.opacity(0.08))
                            .cornerRadius(8)
                        }
                        .disabled(isSavingNote)
                        Button {
                            isEditingNote = false
                        } label: {
                            Text("Cancel")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.palmSecondary)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                        }
                        .disabled(isSavingNote)
                    } else {
                        Button { beginNoteEdit(n) } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "pencil").font(.system(size: 12))
                                Text("Edit").font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundColor(.palmPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.palmPrimary.opacity(0.08))
                            .cornerRadius(8)
                        }
                        Button { Task { await exportFile(type: "note.pdf") } } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "arrow.down.doc.fill").font(.system(size: 12))
                                Text("PDF").font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundColor(.palmPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.palmPrimary.opacity(0.08))
                            .cornerRadius(8)
                        }
                    }
                }

                if isEditingNote {
                    soapEditField(letter: "S", title: "Subjective", text: $editNoteSubjective, color: .palmBlue)
                    soapEditField(letter: "O", title: "Objective", text: $editNoteObjective, color: .palmGreen)
                    soapEditField(letter: "A", title: "Assessment", text: $editNoteAssessment, color: .palmOrange)
                    soapEditField(letter: "P", title: "Plan", text: $editNotePlan, color: .palmPurple)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Narrative Summary")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmText)
                        TextField("Narrative", text: $editNoteNarrative, axis: .vertical)
                            .font(.system(size: 13))
                            .lineLimit(3...10)
                            .padding(10)
                            .background(Color.palmBackground)
                            .cornerRadius(8)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1))
                    }
                    .padding(14)
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                } else if let sd = n.structured_data {
                    if let mood = sd.client_mood, !mood.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "face.smiling")
                                .font(.system(size: 14))
                                .foregroundColor(.palmOrange)
                            Text("Mood: \(mood)")
                                .font(.system(size: 13))
                                .foregroundColor(.palmText)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color.palmOrange.opacity(0.06))
                        .cornerRadius(10)
                    }

                    if let subjective = sd.subjective, !subjective.isEmpty {
                        soapSection(letter: "S", title: "Subjective", content: subjective, color: .palmBlue)
                    }
                    if let objective = sd.objective, !objective.isEmpty {
                        soapSection(letter: "O", title: "Objective", content: objective, color: .palmGreen)
                    }
                    if let assessment = sd.assessment, !assessment.isEmpty {
                        soapSection(letter: "A", title: "Assessment", content: assessment, color: .palmOrange)
                    }
                    if let plan = sd.plan, !plan.isEmpty {
                        soapSection(letter: "P", title: "Plan", content: plan, color: .palmPurple)
                    }

                    let taskStrings = sd.tasksAsStrings
                    if !taskStrings.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                                Image(systemName: "checklist")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.palmPrimary)
                                Text("Tasks Performed")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.palmText)
                            }
                            ForEach(taskStrings, id: \.self) { task in
                                HStack(alignment: .top, spacing: 8) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 12))
                                        .foregroundColor(.palmGreen)
                                        .padding(.top, 2)
                                    Text(task)
                                        .font(.system(size: 13))
                                        .foregroundColor(.palmText)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                        .padding(14)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                    }

                    if let safety = sd.safety_observations, !safety.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                                Image(systemName: "exclamationmark.shield.fill")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.red)
                                Text("Safety Observations")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.palmText)
                            }
                            Text(safety)
                                .font(.system(size: 13))
                                .foregroundColor(.palmText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(14)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.red.opacity(0.15), lineWidth: 1))
                    }

                    if let next = sd.next_visit_plan, !next.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                                Image(systemName: "calendar.badge.clock")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.palmBlue)
                                Text("Next Visit Plan")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.palmText)
                            }
                            Text(next)
                                .font(.system(size: 13))
                                .foregroundColor(.palmText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(14)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBlue.opacity(0.15), lineWidth: 1))
                    }
                }

                if !isEditingNote, let narrative = n.narrative, !narrative.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            Image(systemName: "doc.plaintext")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.palmSecondary)
                            Text("Narrative Summary")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.palmText)
                        }
                        Text(narrative)
                            .font(.system(size: 13))
                            .foregroundColor(.palmText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(14)
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                }
            } else if tabFetchFailed.contains(3) {
                tabErrorState(tab: 3)
            } else {
                documentEmptyState(
                    step: "note",
                    icon: "note.text",
                    title: "No Notes",
                    waitingMessage: "Clinical notes will appear here once the assessment has been processed."
                )
            }
        }
    }

    func soapSection(letter: String, title: String, content: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(letter)
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(.white)
                    .frame(width: 26, height: 26)
                    .background(color)
                    .cornerRadius(7)
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                Spacer()
            }

            Text(content)
                .font(.system(size: 13))
                .foregroundColor(.palmText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
    }

    func soapEditField(letter: String, title: String, text: Binding<String>, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(letter)
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(.white)
                    .frame(width: 26, height: 26)
                    .background(color)
                    .cornerRadius(7)
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                Spacer()
            }
            TextField(title, text: text, axis: .vertical)
                .font(.system(size: 13))
                .lineLimit(3...8)
                .padding(10)
                .background(Color.palmBackground)
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmBorder, lineWidth: 1))
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
    }

    func beginNoteEdit(_ n: VisitNote) {
        let sd = n.structured_data
        editNoteSubjective = sd?.subjective ?? ""
        editNoteObjective = sd?.objective ?? ""
        editNoteAssessment = sd?.assessment ?? ""
        editNotePlan = sd?.plan ?? ""
        editNoteNarrative = n.narrative ?? ""
        isEditingNote = true
    }

    func saveNoteEdits() async {
        guard !isSavingNote else { return }
        await MainActor.run { isSavingNote = true }
        defer { Task { @MainActor in isSavingNote = false } }

        var structured: [String: Any] = [:]
        if let existing = note?.structured_data,
           let data = try? JSONEncoder().encode(existing),
           let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            structured = obj
        }
        structured["subjective"] = editNoteSubjective
        structured["objective"] = editNoteObjective
        structured["assessment"] = editNoteAssessment
        structured["plan"] = editNotePlan

        do {
            let updated = try await api.updateVisitNote(
                visitId: visitId,
                narrative: editNoteNarrative,
                structuredData: structured
            )
            await MainActor.run {
                note = updated
                isEditingNote = false
            }
            PostHogService.shared.capture("note_edited")
        } catch {
            await MainActor.run {
                actionError = "Could not save notes: \(error.palmFriendlyMessage)"
                showActionError = true
            }
        }
    }
}
