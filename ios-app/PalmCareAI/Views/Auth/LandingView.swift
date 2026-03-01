import SwiftUI

// MARK: - Animated Waveform
struct AnimatedWaveform: View {
    let barCount: Int
    let barWidth: CGFloat
    let minHeight: CGFloat
    let maxHeight: CGFloat
    let color: Color
    @State private var phase: CGFloat = 0

    init(barCount: Int = 17, barWidth: CGFloat = 3, minHeight: CGFloat = 8, maxHeight: CGFloat = 48, color: Color = .white) {
        self.barCount = barCount
        self.barWidth = barWidth
        self.minHeight = minHeight
        self.maxHeight = maxHeight
        self.color = color
    }

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<barCount, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(color.opacity(0.25 + 0.6 * waveValue(for: index)))
                    .frame(width: barWidth, height: barHeight(for: index))
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                phase = 1
            }
        }
    }

    private func waveValue(for index: Int) -> CGFloat {
        let normalized = CGFloat(index) / CGFloat(barCount)
        return 0.5 + 0.5 * sin(phase * .pi * 2 + normalized * .pi * 3)
    }

    private func barHeight(for index: Int) -> CGFloat {
        let wave = sin(phase * .pi * 2 + CGFloat(index) * 0.4) * 0.5 + 0.5
        return minHeight + (maxHeight - minHeight) * wave
    }
}

// MARK: - Live Badge
struct LiveBadge: View {
    @State private var blinking = false

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(Color.red)
                .frame(width: 7, height: 7)
                .shadow(color: .red, radius: 3)
                .opacity(blinking ? 0.2 : 1)

            Text("LIVE")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white.opacity(0.8))
                .tracking(1.5)
        }
        .padding(.horizontal, 11)
        .padding(.vertical, 5)
        .background(Color(red: 4/255, green: 47/255, blue: 46/255).opacity(0.6))
        .background(.ultraThinMaterial.opacity(0.3))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(Color.white.opacity(0.14), lineWidth: 1))
        .onAppear {
            withAnimation(.easeInOut(duration: 1.3).repeatForever(autoreverses: true)) {
                blinking = true
            }
        }
    }
}

struct LandingView: View {
    @EnvironmentObject var api: APIService
    @State private var currentPage = 0
    @State private var navigateToLogin = false
    @State private var navigateToRegister = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Deep dark teal background with radial gradients
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

                    // Cyan orb top-right
                    Circle()
                        .fill(Color.palmAccent.opacity(0.15))
                        .frame(width: 300, height: 300)
                        .blur(radius: 80)
                        .offset(x: 100, y: -200)

                    // Teal orb bottom-left
                    Circle()
                        .fill(Color.palmPrimary.opacity(0.12))
                        .frame(width: 250, height: 250)
                        .blur(radius: 70)
                        .offset(x: -80, y: 200)

                    // Bottom gradient fade
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

                // Live badge
                VStack {
                    HStack {
                        Spacer()
                        LiveBadge()
                            .padding(.trailing, 16)
                            .padding(.top, 8)
                    }
                    Spacer()
                }

                // Center waveform
                AnimatedWaveform(barCount: 17, barWidth: 3, minHeight: 8, maxHeight: 48, color: .white)
                    .opacity(0.7)

                // Bottom content
                VStack(spacing: 0) {
                    Spacer()

                    VStack(alignment: .leading, spacing: 0) {
                        // Brand row
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

                        // PALM IT. slogan
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

                        // Subtitle
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

                        // Page dots
                        HStack(spacing: 5) {
                            Capsule()
                                .fill(Color.palmPrimaryLight)
                                .frame(width: currentPage == 0 ? 18 : 5, height: 5)
                            Capsule()
                                .fill(currentPage == 1 ? Color.palmPrimaryLight : Color.white.opacity(0.22))
                                .frame(width: currentPage == 1 ? 18 : 5, height: 5)
                            Capsule()
                                .fill(currentPage == 2 ? Color.palmPrimaryLight : Color.white.opacity(0.22))
                                .frame(width: currentPage == 2 ? 18 : 5, height: 5)
                        }
                        .padding(.bottom, 16)
                        .animation(.easeInOut(duration: 0.25), value: currentPage)

                        // CTA buttons
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
