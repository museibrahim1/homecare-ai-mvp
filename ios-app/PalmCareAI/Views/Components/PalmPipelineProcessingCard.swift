import SwiftUI

/// Paper Pipeline Glass → Processing artboard.
/// Full-height frosted card: progress eyebrow, hero copy, bar, doc checklist.
struct PalmPipelineProcessingCard: View {
    struct Step: Identifiable {
        let id: String
        let title: String
        let status: Status

        enum Status {
            case ready
            case writing
            case next
            case failed
        }
    }

    let readyCount: Int
    let totalCount: Int
    let clientFirstName: String
    let subtitle: String
    let steps: [Step]
    var footer: String = "Stay on this screen. Usually about a minute."

    private var progress: CGFloat {
        guard totalCount > 0 else { return 0 }
        return CGFloat(readyCount) / CGFloat(totalCount)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("\(readyCount) OF \(totalCount) READY")
                    .font(.system(size: 13, weight: .semibold))
                    .tracking(0.5)
                    .foregroundColor(.palmPrimary)

                Text(heroTitle)
                    .font(.system(size: 24, weight: .bold))
                    .tracking(-0.4)
                    .foregroundColor(.palmText)
                    .fixedSize(horizontal: false, vertical: true)

                Text(subtitle)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.palmSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule(style: .continuous)
                        .fill(Color.palmPrimary.opacity(0.12))
                    Capsule(style: .continuous)
                        .fill(Color.palmPrimary)
                        .frame(width: max(6, geo.size.width * progress))
                }
            }
            .frame(height: 6)

            VStack(spacing: 0) {
                ForEach(steps) { step in
                    stepRow(step)
                }
            }
            .frame(maxHeight: .infinity, alignment: .center)

            Text(footer)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmSecondary)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 20)
        .padding(.top, 28)
        .padding(.bottom, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .palmGlassCard(radius: 32, fillOpacity: 0.72)
    }

    private var heroTitle: String {
        let name = clientFirstName.trimmingCharacters(in: .whitespacesAndNewlines)
        if name.isEmpty { return "Building this visit" }
        return "Building \(name)'s visit"
    }

    private func stepRow(_ step: Step) -> some View {
        HStack(spacing: 12) {
            stepGlyph(step.status)
            Text(step.title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(step.status == .next ? Color(red: 148 / 255, green: 163 / 255, blue: 184 / 255) : .palmText)
            Spacer(minLength: 8)
            Text(statusLabel(step.status))
                .font(.system(size: 13, weight: step.status == .writing ? .semibold : .medium))
                .foregroundColor(statusColor(step.status))
        }
        .frame(height: 64)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(step.title), \(statusLabel(step.status))")
    }

    @ViewBuilder
    private func stepGlyph(_ status: Step.Status) -> some View {
        switch status {
        case .ready:
            ZStack {
                Circle().fill(Color.palmPrimary)
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(width: 26, height: 26)
        case .writing:
            Circle()
                .fill(Color.palmPrimary.opacity(0.14))
                .overlay(Circle().stroke(Color.palmPrimary, lineWidth: 1.5))
                .frame(width: 26, height: 26)
                .overlay(
                    ProgressView()
                        .scaleEffect(0.55)
                        .tint(.palmPrimary)
                )
        case .failed:
            ZStack {
                Circle().fill(Color.red.opacity(0.14))
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.red)
            }
            .frame(width: 26, height: 26)
        case .next:
            Circle()
                .fill(Color.palmText.opacity(0.06))
                .frame(width: 26, height: 26)
        }
    }

    private func statusLabel(_ status: Step.Status) -> String {
        switch status {
        case .ready: return "Ready"
        case .writing: return "Writing"
        case .failed: return "Failed"
        case .next: return "Next"
        }
    }

    private func statusColor(_ status: Step.Status) -> Color {
        switch status {
        case .ready: return .palmSecondary
        case .writing: return .palmPrimary
        case .failed: return .red
        case .next: return Color(red: 148 / 255, green: 163 / 255, blue: 184 / 255)
        }
    }
}
