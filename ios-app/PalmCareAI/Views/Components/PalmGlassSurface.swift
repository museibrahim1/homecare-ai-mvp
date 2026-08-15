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
}
