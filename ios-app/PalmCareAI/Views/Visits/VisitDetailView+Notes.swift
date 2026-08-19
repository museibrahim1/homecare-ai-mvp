import SwiftUI

extension VisitDetailView {
    // MARK: - Notes Tab (Paper Pipeline Glass → Notes)

    var notesTab: some View {
        VStack(spacing: 0) {
            if let n = note {
                VStack(spacing: 0) {
                    VStack(alignment: .leading, spacing: 14) {
                        notesSheetHeader(n)

                        if isEditingNote {
                            noteEditBody
                        } else {
                            noteReadBody(n)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 20)
                    .padding(.bottom, 16)

                    if !isEditingNote {
                        Button {
                            Task { await exportFile(type: "note.pdf") }
                        } label: {
                            Text("Approve notes")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 48)
                                .background(Capsule(style: .continuous).fill(Color.palmPrimary))
                                .shadow(color: PalmGlass.tealShadow, radius: 14, y: 8)
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 18)
                        .accessibilityLabel("Approve notes and export as PDF")
                    }
                }
                .palmGlassCard(radius: 28, fillOpacity: 0.62)
            } else if tabFetchFailed.contains("notes") {
                tabErrorState(tab: "notes")
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

    // MARK: - Sheet header (VISIT NOTE · date / SOAP note)

    @ViewBuilder
    func notesSheetHeader(_ n: VisitNote) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(noteDateEyebrow)
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(0.8)
                        .foregroundColor(.palmPrimary)
                    Text("SOAP note")
                        .font(.system(size: 22, weight: .bold))
                        .tracking(-0.4)
                        .foregroundColor(.palmText)
                }
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
                            .padding(.horizontal, 8)
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
                    .accessibilityLabel("Edit clinical notes")
                }
            }

            if let summary = noteSummaryLine(n) {
                Text(summary)
                    .font(.system(size: 13))
                    .foregroundColor(.palmSecondary)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    // MARK: - Read view (SOAP + supporting sections)

    @ViewBuilder
    func noteReadBody(_ n: VisitNote) -> some View {
        if let sd = n.structured_data {
            if let mood = sd.client_mood, !mood.isEmpty {
                paperNoteSection(eyebrow: "MOOD", content: mood)
            }
            if let subjective = sd.subjective, !subjective.isEmpty {
                paperNoteSection(eyebrow: "S · SUBJECTIVE", content: subjective)
            }
            if let objective = sd.objective, !objective.isEmpty {
                paperNoteSection(eyebrow: "O · OBJECTIVE", content: objective)
            }
            if let assessment = sd.assessment, !assessment.isEmpty {
                paperNoteSection(eyebrow: "A · ASSESSMENT", content: assessment)
            }
            if let plan = sd.plan, !plan.isEmpty {
                paperNoteSection(eyebrow: "P · PLAN", content: plan)
            }

            let taskStrings = sd.tasksAsStrings
            if !taskStrings.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("TASKS PERFORMED")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(0.8)
                        .foregroundColor(.palmPrimary)
                    ForEach(taskStrings, id: \.self) { task in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.palmGreen)
                                .padding(.top, 2)
                            Text(task)
                                .font(.system(size: 13))
                                .foregroundColor(paperInkColor)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 12)
                .overlay(alignment: .top) {
                    Rectangle().fill(Color.palmText.opacity(0.08)).frame(height: 1)
                }
            }

            if let safety = sd.safety_observations, !safety.isEmpty {
                paperNoteSection(eyebrow: "SAFETY OBSERVATIONS", content: safety)
            }
            if let next = sd.next_visit_plan, !next.isEmpty {
                paperNoteSection(eyebrow: "NEXT VISIT PLAN", content: next)
            }
        }

        if let narrative = n.narrative, !narrative.isEmpty, narrative != noteSummaryLine(n) {
            paperNoteSection(eyebrow: "NARRATIVE SUMMARY", content: narrative)
        }
    }

    /// One teal-eyebrow section separated from the previous block by a hairline,
    /// matching the Paper Notes SOAP rows.
    func paperNoteSection(eyebrow: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(eyebrow)
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.8)
                .foregroundColor(.palmPrimary)
            Text(content)
                .font(.system(size: 13))
                .foregroundColor(paperInkColor)
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 12)
        .overlay(alignment: .top) {
            Rectangle().fill(Color.palmText.opacity(0.08)).frame(height: 1)
        }
    }

    // MARK: - Edit view

    @ViewBuilder
    var noteEditBody: some View {
        soapEditField(letter: "S · SUBJECTIVE", text: $editNoteSubjective)
        soapEditField(letter: "O · OBJECTIVE", text: $editNoteObjective)
        soapEditField(letter: "A · ASSESSMENT", text: $editNoteAssessment)
        soapEditField(letter: "P · PLAN", text: $editNotePlan)
        VStack(alignment: .leading, spacing: 8) {
            Text("NARRATIVE SUMMARY")
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.8)
                .foregroundColor(.palmPrimary)
            TextField("Narrative", text: $editNoteNarrative, axis: .vertical)
                .font(.system(size: 13))
                .lineLimit(3...10)
                .padding(10)
                .background(Color.white.opacity(0.75))
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmGlassBorder, lineWidth: 1))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 12)
        .overlay(alignment: .top) {
            Rectangle().fill(Color.palmText.opacity(0.08)).frame(height: 1)
        }
    }

    func soapEditField(letter: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(letter)
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.8)
                .foregroundColor(.palmPrimary)
            TextField(letter, text: text, axis: .vertical)
                .font(.system(size: 13))
                .lineLimit(3...8)
                .padding(10)
                .background(Color.white.opacity(0.75))
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmGlassBorder, lineWidth: 1))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 12)
        .overlay(alignment: .top) {
            Rectangle().fill(Color.palmText.opacity(0.08)).frame(height: 1)
        }
    }

    // MARK: - Display helpers

    /// "VISIT NOTE · AUG 14, 2026" when a date is available, else "VISIT NOTE".
    var noteDateEyebrow: String {
        guard let raw = note?.created_at ?? note?.updated_at else { return "VISIT NOTE" }
        let withFractional = ISO8601DateFormatter()
        withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        guard let date = withFractional.date(from: raw) ?? plain.date(from: raw) else {
            return "VISIT NOTE"
        }
        let out = DateFormatter()
        out.dateFormat = "MMM d, yyyy"
        return "VISIT NOTE · \(out.string(from: date).uppercased())"
    }

    /// First line of the narrative, used as the short summary under the title.
    func noteSummaryLine(_ n: VisitNote) -> String? {
        guard let narrative = n.narrative else { return nil }
        return narrative
            .components(separatedBy: CharacterSet.newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty }
    }

    // MARK: - API wiring (unchanged)

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
