import SwiftUI

/// The PALM brand mark from Paper Auth/App Glass: teal radial blob, soft
/// outlined rings, and an outlined mic. Used on landing, login, lock screen,
/// and the floating tab center.
struct PalmOrbLogo: View {
    var size: CGFloat = 72
    /// Gently morphs the blob outline. Keep off for small/inline marks.
    var animated: Bool = false

    @State private var morphPhase: CGFloat = 0.35

    var body: some View {
        ZStack {
            // Outer faint purple ring (Paper `#8B5CF638` only on the outermost stroke)
            LandingOrbShape(phase: morphPhase + 0.2)
                .stroke(Color(red: 139 / 255, green: 92 / 255, blue: 246 / 255).opacity(0.22), lineWidth: 1)
                .frame(width: size * 1.28, height: size * 1.28)

            LandingOrbShape(phase: morphPhase + 0.1)
                .stroke(Color.palmPrimaryLight.opacity(0.28), lineWidth: 1)
                .frame(width: size * 1.14, height: size * 1.14)

            LandingOrbShape(phase: morphPhase)
                .stroke(Color.palmPrimary.opacity(0.35), lineWidth: 1.5)
                .frame(width: size * 1.05, height: size * 1.05)

            LandingOrbShape(phase: morphPhase)
                .fill(PalmBrandOrb.fill)
                .shadow(color: Color.palmPrimary.opacity(0.45), radius: size * 0.12, y: 0)
                .overlay(
                    LandingOrbShape(phase: morphPhase)
                        .fill(
                            RadialGradient(
                                colors: [.white.opacity(0.28), .clear],
                                center: UnitPoint(x: 0.3, y: 0.25),
                                startRadius: 0,
                                endRadius: size * 0.55
                            )
                        )
                )

            Image(systemName: "mic")
                .font(.system(size: size * 0.28, weight: .medium))
                .foregroundColor(.white)
        }
        .frame(width: size, height: size)
        .onAppear {
            guard animated else { return }
            withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true)) {
                morphPhase = 1.1
            }
        }
        .accessibilityHidden(true)
    }
}

enum PalmBrandOrb {
    /// Paper Brand Orb radial: `#5EEAD4 → #0D9488 → #0F766E`.
    static var fill: RadialGradient {
        RadialGradient(
            colors: [
                Color(red: 94 / 255, green: 234 / 255, blue: 212 / 255),
                Color.palmPrimary,
                Color(red: 15 / 255, green: 118 / 255, blue: 110 / 255),
            ],
            center: UnitPoint(x: 0.35, y: 0.3),
            startRadius: 0,
            endRadius: 90
        )
    }
}

#Preview {
    VStack(spacing: 30) {
        PalmOrbLogo(size: 120, animated: true)
        PalmOrbLogo(size: 72)
        PalmOrbLogo(size: 38)
    }
    .padding()
    .background(Color.palmMintWash)
}
