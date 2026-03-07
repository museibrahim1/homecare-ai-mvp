import SwiftUI

// MARK: - Landing Orb (ambient pulsing version)

struct LandingOrb: View {
    @State private var rotation: Double = 0
    @State private var morphPhase: CGFloat = 0
    @State private var glowPulse: CGFloat = 0

    var body: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { ring in
                LandingOrbRing(phase: morphPhase + CGFloat(ring) * 0.7, ringIndex: ring)
                    .frame(width: ringSize(for: ring), height: ringSize(for: ring))
                    .rotationEffect(.degrees(rotation + Double(ring) * 40))
            }

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
                .frame(width: 120, height: 120)
                .shadow(color: Color.palmPrimary.opacity(0.4 + glowPulse * 0.2), radius: 25 + glowPulse * 10, y: 0)
                .overlay(
                    LandingOrbShape(phase: morphPhase)
                        .fill(
                            RadialGradient(
                                colors: [.white.opacity(0.2), .clear],
                                center: .topLeading,
                                startRadius: 0,
                                endRadius: 70
                            )
                        )
                        .frame(width: 120, height: 120)
                )

            Image(systemName: "mic.fill")
                .font(.system(size: 32, weight: .medium))
                .foregroundColor(.white)
                .shadow(color: .white.opacity(0.3), radius: 4)
        }
        .onAppear {
            withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
                rotation = 360
            }
            withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true)) {
                morphPhase = 1
            }
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                glowPulse = 1
            }
        }
    }

    private func ringSize(for ring: Int) -> CGFloat {
        150 + CGFloat(ring) * 28
    }
}

struct LandingOrbShape: Shape {
    var phase: CGFloat

    var animatableData: CGFloat {
        get { phase }
        set { phase = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2
        let points = 100
        var path = Path()

        for i in 0...points {
            let angle = CGFloat(i) / CGFloat(points) * .pi * 2
            let wobble1 = sin(angle * 3 + phase * .pi * 2) * 5
            let wobble2 = cos(angle * 2 - phase * .pi * 1.5) * 4
            let wobble3 = sin(angle * 5 + phase * .pi * 3) * 2.5
            let r = radius + wobble1 + wobble2 + wobble3

            let point = CGPoint(
                x: center.x + r * cos(angle),
                y: center.y + r * sin(angle)
            )

            if i == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }
        path.closeSubpath()
        return path
    }
}

struct LandingOrbRing: View {
    let phase: CGFloat
    let ringIndex: Int

    var body: some View {
        LandingOrbShape(phase: phase)
            .stroke(
                AngularGradient(colors: ringColors, center: .center),
                lineWidth: ringIndex == 0 ? 1.5 : 1
            )
            .opacity(0.25 - Double(ringIndex) * 0.06)
    }

    private var ringColors: [Color] {
        switch ringIndex {
        case 0: return [Color.palmPrimary, Color.palmAccent, Color(red: 139/255, green: 92/255, blue: 246/255), Color.palmPrimary]
        case 1: return [Color.palmAccent, Color(red: 139/255, green: 92/255, blue: 246/255), Color.palmPrimaryLight, Color.palmAccent]
        default: return [Color(red: 139/255, green: 92/255, blue: 246/255), Color.palmPrimary, Color.palmAccent, Color(red: 139/255, green: 92/255, blue: 246/255)]
        }
    }
}

// MARK: - Landing View

struct LandingView: View {
    @EnvironmentObject var api: APIService
    @State private var navigateToLogin = false
    @State private var navigateToRegister = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Deep dark teal background
                ZStack {
                    LinearGradient(
                        colors: [
                            Color(red: 7/255, green: 31/255, blue: 32/255),
                            Color(red: 10/255, green: 47/255, blue: 42/255),
                            Color(red: 13/255, green: 61/255, blue: 53/255),
                            Color(red: 8/255, green: 40/255, blue: 40/255),
                            Color(red: 5/255, green: 24/255, blue: 24/255),
                            Color(red: 3/255, green: 15/255, blue: 15/255),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )

                    Circle()
                        .fill(Color.palmAccent.opacity(0.15))
                        .frame(width: 300, height: 300)
                        .blur(radius: 80)
                        .offset(x: 100, y: -200)

                    Circle()
                        .fill(Color.palmPrimary.opacity(0.12))
                        .frame(width: 250, height: 250)
                        .blur(radius: 70)
                        .offset(x: -80, y: 200)

                    VStack {
                        Spacer()
                        LinearGradient(
                            colors: [
                                Color(red: 4/255, green: 47/255, blue: 46/255).opacity(0),
                                Color(red: 4/255, green: 47/255, blue: 46/255).opacity(0.55),
                                Color(red: 4/255, green: 47/255, blue: 46/255).opacity(0.94),
                                Color(red: 4/255, green: 47/255, blue: 46/255),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(height: 350)
                    }
                }
                .ignoresSafeArea()

                // Center orb
                VStack {
                    Spacer()
                        .frame(height: UIScreen.main.bounds.height * 0.18)

                    LandingOrb()
                        .frame(width: 220, height: 220)
                        .accessibilityHidden(true)

                    Spacer()
                }

                // Bottom content
                VStack(spacing: 0) {
                    Spacer()

                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 9) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 11)
                                    .fill(LinearGradient.palmPrimary)
                                    .frame(width: 38, height: 38)
                                    .shadow(color: Color.palmPrimary.opacity(0.5), radius: 6, y: 2)

                                Image(systemName: "mic.fill")
                                    .font(.system(size: 17))
                                    .foregroundColor(.white)
                            }

                            Text("PalmCare AI")
                                .font(.system(size: 17, weight: .heavy))
                                .foregroundColor(.white)
                                .tracking(-0.3)

                            Spacer()

                            Text("AI-POWERED")
                                .font(.system(size: 10, weight: .bold))
                                .tracking(0.8)
                                .foregroundColor(Color.palmPrimaryLight)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 3)
                                .background(Color.palmPrimary.opacity(0.25))
                                .overlay(
                                    Capsule().stroke(Color.palmPrimaryLight.opacity(0.35), lineWidth: 1)
                                )
                                .clipShape(Capsule())
                        }
                        .padding(.bottom, 18)

                        VStack(alignment: .leading, spacing: 0) {
                            Text("PALM")
                                .font(.system(size: 42, weight: .black))
                                .foregroundColor(.white)
                                .tracking(-1.5)

                            Text("IT.")
                                .font(.system(size: 42, weight: .black))
                                .italic()
                                .foregroundColor(Color.palmPrimaryLight)
                                .tracking(-1.5)
                        }
                        .padding(.bottom, 10)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Record. Transcribe. Contract.")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white.opacity(0.85))

                            Text("Every care assessment — handled in seconds.\nYour clients get proposals. You get your time back.")
                                .font(.system(size: 12))
                                .foregroundColor(.white.opacity(0.55))
                                .lineSpacing(4)
                        }
                        .padding(.bottom, 20)

                        Button {
                            navigateToRegister = true
                        } label: {
                            Text("GET STARTED")
                                .font(.system(size: 14, weight: .heavy))
                                .tracking(0.2)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(LinearGradient(colors: [Color.palmPrimary, Color.palmPrimaryDark], startPoint: .topLeading, endPoint: .bottomTrailing))
                                .cornerRadius(12)
                                .shadow(color: Color.palmPrimary.opacity(0.35), radius: 7, y: 3)
                        }
                        .accessibilityLabel("Get started, create an account")
                        .padding(.bottom, 9)

                        Button {
                            navigateToLogin = true
                        } label: {
                            Text("Already have an account? Sign in →")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                                .background(Color.white.opacity(0.07))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.white.opacity(0.15), lineWidth: 1.5)
                                )
                                .cornerRadius(12)
                        }
                        .accessibilityLabel("Sign in to existing account")
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 30)
                }
            }
            .navigationDestination(isPresented: $navigateToLogin) {
                LoginView()
                    .environmentObject(api)
            }
            .navigationDestination(isPresented: $navigateToRegister) {
                RegisterView()
                    .environmentObject(api)
            }
        }
    }
}

#Preview {
    LandingView()
        .environmentObject(APIService.shared)
}
