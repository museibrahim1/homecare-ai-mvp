import SwiftUI

/// Shared status chip so Home queue, visit overview, and contract headers
/// read as one product (Pipeline Glass direction).
struct PalmStatusChip: View {
    enum Tone {
        case neutral, success, warning, danger, info, brand

        var color: Color {
            switch self {
            case .neutral: return .palmSecondary
            case .success: return .palmGreen
            case .warning: return .palmOrange
            case .danger: return .red
            case .info: return .palmBlue
            case .brand: return .palmPrimary
            }
        }
    }

    let text: String
    var tone: Tone = .neutral

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(tone.color)
                .frame(width: 6, height: 6)
            Text(text)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(tone.color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(tone.color.opacity(0.1))
        .cornerRadius(10)
    }
}
