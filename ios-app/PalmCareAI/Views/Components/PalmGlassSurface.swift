import SwiftUI

// MARK: - Pipeline Glass tokens (Paper App Glass)

extension Color {
    /// Mint wash ground from App Glass (`#E7F1EF`).
    static let palmMintWash = Color(red: 231 / 255, green: 241 / 255, blue: 239 / 255)
    /// Soft orb glow A (`#7ED4C8`).
    static let palmGlowTeal = Color(red: 126 / 255, green: 212 / 255, blue: 200 / 255)
    /// Soft orb glow B (`#B8E0D8`).
    static let palmGlowMint = Color(red: 184 / 255, green: 224 / 255, blue: 216 / 255)
    /// Frosted card fill (~62% white).
    static let palmGlassFill = Color.white.opacity(0.62)
    /// Stronger frost for tab chrome (~62% → 0.62, design uses ~0x9E).
    static let palmGlassChrome = Color.white.opacity(0.62)
    /// Hairline on glass (`#FFFFFF` ~92%).
    static let palmGlassBorder = Color.white.opacity(0.92)
}

enum PalmGlass {
    static let cardRadius: CGFloat = 28
    static let chipRadius: CGFloat = 24
    static let tabRadius: CGFloat = 32
    static let shadow = Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255).opacity(0.08)
    static let tealShadow = Color.palmPrimary.opacity(0.28)
}

// MARK: - Mint wash + soft orbs

struct PalmGlassBackground: View {
    var body: some View {
        ZStack {
            Color.palmMintWash
            Circle()
                .fill(Color.palmGlowTeal.opacity(0.45))
                .frame(width: 280, height: 280)
                .blur(radius: 2)
                .offset(x: 110, y: -220)
            Circle()
                .fill(Color.palmGlowMint.opacity(0.7))
                .frame(width: 180, height: 180)
                .blur(radius: 1)
                .offset(x: -130, y: 260)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

// MARK: - Shared glass card chrome

struct PalmGlassCardModifier: ViewModifier {
    var radius: CGFloat = PalmGlass.cardRadius
    var fillOpacity: Double = 0.62
    var padding: CGFloat? = nil

    func body(content: Content) -> some View {
        content
            .padding(padding ?? 0)
            .background {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(.ultraThinMaterial)
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(Color.white.opacity(fillOpacity))
            }
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(Color.palmGlassBorder, lineWidth: 1)
            )
            .shadow(color: PalmGlass.shadow, radius: 20, y: 12)
    }
}

extension View {
    /// Frosted white glass surface matching Paper App Glass cards.
    func palmGlassCard(
        radius: CGFloat = PalmGlass.cardRadius,
        fillOpacity: Double = 0.62,
        padding: CGFloat = 0
    ) -> some View {
        modifier(PalmGlassCardModifier(radius: radius, fillOpacity: fillOpacity, padding: padding))
    }

    /// Full-screen mint wash behind any App / Pipeline / Auth glass screen.
    func palmGlassScreen() -> some View {
        background { PalmGlassBackground() }
    }

    /// Soft white field on glass forms (Login / Sign up / Add Client).
    func palmGlassField(focused: Bool = false) -> some View {
        self
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Color.white.opacity(0.85))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(
                        focused ? Color.palmPrimary.opacity(0.55) : Color.palmBorder.opacity(0.8),
                        lineWidth: 1
                    )
            )
    }
}

/// Uppercase eyebrow label used across Paper glass forms.
struct PalmGlassLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(0.8)
            .foregroundColor(.palmSecondary)
    }
}

/// Status pill for Pipeline Glass checklists (Ready / Writing / Next / Failed).
/// Used on the Overview processing checklist and the Record processing overlay.
struct PalmPipelinePill: View {
    let text: String
    let color: Color
    var showsSpinner: Bool = false

    var body: some View {
        HStack(spacing: 4) {
            if showsSpinner {
                ProgressView()
                    .scaleEffect(0.55)
                    .tint(color)
            }
            Text(text.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(0.5)
        }
        .foregroundColor(color)
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(Capsule(style: .continuous).fill(color.opacity(0.14)))
    }
}
