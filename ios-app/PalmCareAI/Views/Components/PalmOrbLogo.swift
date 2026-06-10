import SwiftUI

/// The PALM brand mark — the flowing gradient orb with a mic. Used everywhere
/// a logo is needed (landing, login, register, lock screen) so branding stays
/// consistent. Reuses `LandingOrbShape` for the organic blob outline.
struct PalmOrbLogo: View {
    var size: CGFloat = 72
    /// Gently morphs the blob outline. Keep off for small/inline marks.
    var animated: Bool = false

    @State private var morphPhase: CGFloat = 0.35

    var body: some View {
        ZStack {
            LandingOrbShape(phase: morphPhase)
                .fill(
                    AngularGradient(
                        colors: [
                            Color.palmPrimary,
                            Color.palmAccent,
                            Color(red: 139/255, green: 92/255, blue: 246/255),
                            Color.palmPrimaryLight,
                            Color.palmPrimary,
                        ],
                        center: .center
                    )
                )
                .shadow(color: Color.palmPrimary.opacity(0.35), radius: size * 0.12, y: size * 0.04)
                .overlay(
                    LandingOrbShape(phase: morphPhase)
                        .fill(
                            RadialGradient(
                                colors: [.white.opacity(0.22), .clear],
                                center: .topLeading,
                                startRadius: 0,
                                endRadius: size * 0.6
                            )
                        )
                )

            Image(systemName: "mic.fill")
                .font(.system(size: size * 0.3, weight: .medium))
                .foregroundColor(.white)
                .shadow(color: .white.opacity(0.3), radius: 3)
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

#Preview {
    VStack(spacing: 30) {
        PalmOrbLogo(size: 120, animated: true)
        PalmOrbLogo(size: 72)
        PalmOrbLogo(size: 38)
    }
    .padding()
}
