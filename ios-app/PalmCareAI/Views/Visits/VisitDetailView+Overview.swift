import SwiftUI

extension VisitDetailView {
    // MARK: - Overview Tab

    var overviewTab: some View {
        VStack(spacing: 16) {
            if let v = visit {
                statusCard(v)
                pipelineCard(v)
                quickStatsGrid
            }
        }
    }

    func statusCard(_ v: Visit) -> some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    if let name = v.client?.full_name {
                        Text(name)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.palmText)
                    }
                    Text("Created \(formattedDate(v.created_at))")
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                }
                Spacer()
                statusBadge(v.status)
            }

            if let send = v.agreement_send {
                agreementSendCard(send)
            }

            if let scheduled = v.scheduled_start {
                HStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                        .foregroundColor(.palmBlue)
                    Text("Scheduled: \(formattedDate(scheduled))")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.palmSecondary)
                    Spacer()
                }
            }

            if let notes = v.admin_notes, !notes.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "note.text")
                        .font(.system(size: 12))
                        .foregroundColor(.palmOrange)
                    Text(notes)
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                    Spacer()
                }
            }
        }
        .padding(16)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
    }

    func agreementSendCard(_ send: AgreementSend) -> some View {
        let status = (send.status ?? "sent").lowercased()
        let tint: Color = {
            switch status {
            case "signed": return .palmGreen
            case "bounced": return .red
            case "opened", "delivered": return .palmBlue
            default: return .palmPurple
            }
        }()

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(tint)
                Text("Agreement send")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmText)
                Spacer()
                Text(send.displayLabel)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(tint)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(tint.opacity(0.12))
                    .cornerRadius(10)
            }
            if let email = send.recipient_email {
                Text(email)
                    .font(.system(size: 12))
                    .foregroundColor(.palmSecondary)
            }
            if send.isAwaitingSignature || status == "bounced" {
                HStack(spacing: 8) {
                    if send.isAwaitingSignature {
                        Button {
                            Task { await markAgreementStatus("signed") }
                        } label: {
                            Text("Mark signed")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(Color.palmGreen)
                                .cornerRadius(8)
                        }
                        Button {
                            Task { await markAgreementStatus("bounced") }
                        } label: {
                            Text("Mark bounced")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.red)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(Color.red.opacity(0.08))
                                .cornerRadius(8)
                        }
                    }
                    if status == "bounced" {
                        Button {
                            showEmailSheet = true
                        } label: {
                            Text("Resend")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(Color.palmPrimary)
                                .cornerRadius(8)
                        }
                    }
                }
            }
        }
        .padding(12)
        .background(tint.opacity(0.06))
        .cornerRadius(10)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(tint.opacity(0.2), lineWidth: 1))
    }

    func pipelineCard(_ v: Visit) -> some View {
        let steps: [(String, String, String)] = [
            ("transcription", "Transcribe", "waveform"),
            ("diarization", "Speakers", "person.2.fill"),
            ("billing", "Billables", "dollarsign.circle"),
            ("note", "Notes", "note.text"),
            ("contract", "Contract", "doc.text.fill"),
        ]
        let ready = documentReadyCount
        let retryable = steps.filter { pipelineStepState(v, step: $0.0).canRetry }

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("Processing Pipeline")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                Spacer()
                Text("\(ready) of 4 ready")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(ready == 4 ? .palmGreen : .palmSecondary)
            }

            HStack(spacing: 0) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    let state = pipelineStepState(v, step: step.0)
                    VStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .fill(state.color.opacity(0.15))
                                .frame(width: 36, height: 36)
                            if state.isProcessing {
                                ProgressView()
                                    .scaleEffect(0.6)
                            } else if state.isFailed {
                                Image(systemName: "xmark")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(state.color)
                            } else if state.isStuck {
                                Image(systemName: "exclamationmark")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(state.color)
                            } else {
                                Image(systemName: state.isComplete ? "checkmark" : step.2)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(state.color)
                            }
                        }
                        Text(step.1)
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(state.color)
                    }
                    .frame(maxWidth: .infinity)

                    if index < steps.count - 1 {
                        Rectangle()
                            .fill(state.isComplete ? Color.palmGreen.opacity(0.3) : Color.palmBorder)
                            .frame(height: 2)
                            .frame(maxWidth: 20)
                            .padding(.bottom, 18)
                    }
                }
            }

            if !retryable.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Partial packet. Retry only what failed.")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.palmSecondary)

                    ForEach(retryable, id: \.0) { step in
                        let state = pipelineStepState(v, step: step.0)
                        HStack(spacing: 10) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(step.1)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.palmText)
                                Text(state.errorMessage ?? (state.isStuck
                                      ? "Stuck for 5+ minutes"
                                      : "Failed. Retry this document."))
                                    .font(.system(size: 11))
                                    .foregroundColor(.palmSecondary)
                                    .lineLimit(2)
                            }
                            Spacer()
                            Button {
                                Task { await retryPipelineStep(step.0) }
                            } label: {
                                HStack(spacing: 4) {
                                    if retryingPipelineStep == step.0 {
                                        ProgressView().scaleEffect(0.6).tint(.white)
                                    } else {
                                        Image(systemName: "arrow.clockwise")
                                            .font(.system(size: 11, weight: .bold))
                                    }
                                    Text("Retry")
                                        .font(.system(size: 12, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(Color.palmPrimary)
                                .cornerRadius(8)
                            }
                            .disabled(retryingPipelineStep != nil)
                            .accessibilityLabel(pipelineStepRetryLabel(step.0))
                        }
                        .padding(10)
                        .background(Color.palmOrange.opacity(0.08))
                        .cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmOrange.opacity(0.25), lineWidth: 1))
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(16)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
    }

    var quickStatsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            statCard(
                icon: "text.quote",
                label: "Transcript",
                value: transcript?.word_count.map { "\($0) words" } ?? "—",
                color: .palmPrimary,
                tapAction: { activeTab = 1 }
            )
            statCard(
                icon: "dollarsign.circle.fill",
                label: "Billables",
                value: billables?.items.map { "\($0.count) items" } ?? "—",
                color: .palmGreen,
                tapAction: { activeTab = 2 }
            )
            statCard(
                icon: "note.text",
                label: "Notes",
                value: note != nil ? "SOAP Ready" : "—",
                color: .palmBlue,
                tapAction: { activeTab = 3 }
            )
            statCard(
                icon: "doc.text.fill",
                label: "Contract",
                value: contract?.title ?? "—",
                color: .palmPurple,
                tapAction: { activeTab = 4 }
            )
        }
    }

    func statCard(icon: String, label: String, value: String, color: Color, tapAction: @escaping () -> Void) -> some View {
        Button(action: tapAction) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(color)
                    .frame(width: 36, height: 36)
                    .background(color.opacity(0.1))
                    .cornerRadius(10)

                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.palmSecondary)
                    Text(value)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.palmText)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Transcript Tab

}
