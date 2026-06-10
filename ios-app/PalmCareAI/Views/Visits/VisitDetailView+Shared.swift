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

    func tabErrorState(tab: Int) -> some View {
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
        let color: Color = {
            switch status.lowercased() {
            case "completed": return .palmGreen
            case "processing": return .palmBlue
            case "pending", "pending_review": return .palmOrange
            case "failed": return .red
            default: return .palmSecondary
            }
        }()

        return HStack(spacing: 4) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(status.replacingOccurrences(of: "_", with: " ").capitalized)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(color.opacity(0.1))
        .cornerRadius(10)
    }

    // MARK: - Pipeline Helpers

    struct PipelineStepState {
        let isComplete: Bool
        let isProcessing: Bool
        let color: Color
    }

    func pipelineStepState(_ v: Visit, step: String) -> PipelineStepState {
        guard let ps = v.pipeline_state,
              let stepData = ps[step]?.value as? [String: Any],
              let status = stepData["status"] as? String else {
            return PipelineStepState(isComplete: false, isProcessing: false, color: .palmSecondary)
        }

        switch status {
        case "completed":
            return PipelineStepState(isComplete: true, isProcessing: false, color: .palmGreen)
        case "processing", "running":
            return PipelineStepState(isComplete: false, isProcessing: true, color: .palmBlue)
        case "failed":
            return PipelineStepState(isComplete: false, isProcessing: false, color: .red)
        default:
            return PipelineStepState(isComplete: false, isProcessing: false, color: .palmSecondary)
        }
    }

    // MARK: - Data Loading

}
