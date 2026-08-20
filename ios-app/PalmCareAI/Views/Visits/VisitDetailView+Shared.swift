import SwiftUI

extension VisitDetailView {
    var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading assessment...")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }

    func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 32))
                .foregroundColor(.palmOrange)
            Text("Error Loading Assessment")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.palmText)
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
            Button("Retry") { Task { await loadVisit() } }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 10)
                .background(Color.palmPrimary)
                .cornerRadius(10)
                .accessibilityLabel("Retry loading assessment")
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    func emptyState(icon: String, title: String, message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundColor(.palmSecondary.opacity(0.35))
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmText)
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 20)
    }

    func tabErrorState(tab: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 32))
                .foregroundColor(.palmOrange)
            Text("Failed to Load")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmText)
            Text("Check your connection and try again.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
            Button {
                tabFetchFailed.remove(tab)
                Task { await loadTabDataIfNeeded() }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12, weight: .bold))
                    Text("Retry")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.palmPrimary)
                .cornerRadius(10)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    func statusBadge(_ status: String) -> some View {
        let tone: PalmStatusChip.Tone = {
            switch status.lowercased() {
            case "completed": return .success
            case "processing": return .info
            case "pending", "pending_review": return .warning
            case "failed", "pipeline_failed": return .danger
            default: return .neutral
            }
        }()
        return PalmStatusChip(
            text: status.replacingOccurrences(of: "_", with: " ").capitalized,
            tone: tone
        )
    }

    // MARK: - Pipeline Helpers

    struct PipelineStepState {
        let isComplete: Bool
        let isProcessing: Bool
        let isFailed: Bool
        let isStuck: Bool
        let errorMessage: String?
        let color: Color

        var canRetry: Bool { isFailed || isStuck }
    }

    /// Deliverable docs counted in "X of N ready" — Paper Processing order:
    /// Care plan → Billables → Notes → Contract. Transcript is not a deliverable.
    /// `care_plan` mirrors the contract pipeline step (written together).
    /// Billables are omitted when this visit finished billing with zero items.
    var documentPipelineSteps: [String] {
        var steps = ["care_plan"]
        if shouldShowBillablesTab { steps.append("billing") }
        steps.append(contentsOf: ["note", "contract"])
        return steps
    }

    var documentExpectedCount: Int { documentPipelineSteps.count }

    var documentReadyCount: Int {
        guard let v = visit else { return 0 }
        return documentPipelineSteps.reduce(0) { count, step in
            count + (pipelineStepState(v, step: step).isComplete ? 1 : 0)
        }
    }

    var hasStuckPipelineStep: Bool {
        guard let v = visit else { return false }
        return documentPipelineSteps.contains { pipelineStepState(v, step: $0).isStuck }
    }

    var hasFailedPipelineStep: Bool {
        guard let v = visit else { return false }
        return ["transcription", "diarization", "billing", "note", "contract"]
            .contains { pipelineStepState(v, step: $0).isFailed }
    }

    func pipelineStepState(_ v: Visit, step: String) -> PipelineStepState {
        let resolvedStep = step == "care_plan" ? "contract" : step
        guard let ps = v.pipeline_state,
              let stepData = ps[resolvedStep]?.value as? [String: Any],
              let status = stepData["status"] as? String else {
            return PipelineStepState(
                isComplete: false,
                isProcessing: false,
                isFailed: false,
                isStuck: false,
                errorMessage: nil,
                color: .palmSecondary
            )
        }

        let errorMessage = stepData["error"] as? String
        let stuck = Self.isStepStuck(status: status, startedAt: stepData["started_at"] as? String)

        switch status.lowercased() {
        case "completed":
            return PipelineStepState(
                isComplete: true,
                isProcessing: false,
                isFailed: false,
                isStuck: false,
                errorMessage: nil,
                color: .palmGreen
            )
        case "processing", "running", "queued":
            return PipelineStepState(
                isComplete: false,
                isProcessing: !stuck,
                isFailed: false,
                isStuck: stuck,
                errorMessage: errorMessage,
                color: stuck ? .palmOrange : .palmBlue
            )
        case "failed":
            return PipelineStepState(
                isComplete: false,
                isProcessing: false,
                isFailed: true,
                isStuck: false,
                errorMessage: errorMessage,
                color: .red
            )
        default:
            return PipelineStepState(
                isComplete: false,
                isProcessing: false,
                isFailed: false,
                isStuck: false,
                errorMessage: errorMessage,
                color: .palmSecondary
            )
        }
    }

    /// A step is stuck when it has been processing/queued for 5+ minutes.
    static func isStepStuck(status: String, startedAt: String?) -> Bool {
        let s = status.lowercased()
        guard s == "processing" || s == "running" || s == "queued" else { return false }
        guard let startedAt, let started = parsePipelineDate(startedAt) else { return false }
        return Date().timeIntervalSince(started) >= 5 * 60
    }

    static func parsePipelineDate(_ raw: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: raw) { return d }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: raw)
    }

    func pipelineStepRetryLabel(_ step: String) -> String {
        switch step {
        case "transcription": return "Retry transcript"
        case "diarization": return "Retry speakers"
        case "billing": return "Retry billables"
        case "note": return "Retry notes"
        case "care_plan": return "Retry care plan"
        case "contract": return "Retry contract"
        default: return "Retry step"
        }
    }

    /// Empty tab content that offers per-doc retry when that step failed or stuck.
    func documentEmptyState(step: String, icon: String, title: String, waitingMessage: String) -> some View {
        let retryStep = step == "care_plan" ? "contract" : step
        let state = visit.map { pipelineStepState($0, step: step) }
        if let state, state.isFailed {
            return AnyView(pipelineRecoveryState(
                icon: "exclamationmark.triangle.fill",
                title: "\(title) failed",
                message: state.errorMessage ?? "This document did not finish. Retry just this step. You do not need to restart the visit.",
                step: retryStep,
                iconColor: .red
            ))
        }
        if let state, state.isStuck {
            return AnyView(pipelineRecoveryState(
                icon: "clock.badge.exclamationmark",
                title: "\(title) is stuck",
                message: "This step has been running for more than 5 minutes. Retry it without restarting the whole visit.",
                step: retryStep,
                iconColor: .palmOrange
            ))
        }
        if isPipelineProcessing {
            return AnyView(emptyState(
                icon: icon,
                title: title,
                message: "Still writing this document. It will show up here when it is ready. Live progress is on the Palm It processing screen."
            ))
        }
        return AnyView(emptyState(icon: icon, title: title, message: waitingMessage))
    }

    func pipelineRecoveryState(
        icon: String,
        title: String,
        message: String,
        step: String,
        iconColor: Color
    ) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundColor(iconColor)
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmText)
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
            Button {
                Task { await retryPipelineStep(step) }
            } label: {
                HStack(spacing: 6) {
                    if retryingPipelineStep == step {
                        ProgressView().scaleEffect(0.7).tint(.white)
                    } else {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 12, weight: .bold))
                    }
                    Text(pipelineStepRetryLabel(step))
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.palmPrimary)
                .cornerRadius(10)
            }
            .disabled(retryingPipelineStep != nil)
            .accessibilityLabel(pipelineStepRetryLabel(step))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 20)
    }

    // MARK: - Data Loading

}
