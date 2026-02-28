import SwiftUI

// MARK: - Animated Waveform
struct AnimatedWaveform: View {
    let barCount: Int
    let barWidth: CGFloat
    let minHeight: CGFloat
    let maxHeight: CGFloat
    let color: Color
    @State private var phase: CGFloat = 0

    init(barCount: Int = 24, barWidth: CGFloat = 4, minHeight: CGFloat = 8, maxHeight: CGFloat = 36, color: Color = .white) {
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
                    .fill(color.opacity(0.6 + 0.4 * waveValue(for: index)))
                    .frame(width: barWidth, height: barHeight(for: index))
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
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

// MARK: - AI Processing Dots
struct AIProcessingDots: View {
    let color: Color
    @State private var animating = false

    init(color: Color = .white) {
        self.color = color
    }

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
                    .scaleEffect(animating ? 1.2 : 0.8)
                    .opacity(animating ? 1 : 0.5)
                    .animation(
                        .easeInOut(duration: 0.5)
                        .repeatForever(autoreverses: true)
                        .delay(Double(index) * 0.15),
                        value: animating
                    )
            }
        }
        .onAppear { animating = true }
    }
}

// MARK: - Pulsing Glow Ring
struct PulsingGlowRing: View {
    let color: Color
    let size: CGFloat
    @State private var scale: CGFloat = 1
    @State private var opacity: Double = 0.5

    var body: some View {
        Circle()
            .stroke(color, lineWidth: 2)
            .frame(width: size, height: size)
            .scaleEffect(scale)
            .opacity(opacity)
            .onAppear {
                withAnimation(.easeOut(duration: 1.5).repeatForever(autoreverses: false)) {
                    scale = 1.4
                    opacity = 0
                }
            }
    }
}

struct LandingView: View {
    @EnvironmentObject var api: APIService
    @State private var currentPage = 0
    @State private var navigateToLogin = false
    @State private var navigateToRegister = false

    private let pages: [(icon: String, title: String, subtitle: String)] = [
        (
            "waveform.and.mic",
            "Record & Transcribe",
            "Capture client visits with one tap. AI transcribes and organizes everything automatically."
        ),
        (
            "doc.text.magnifyingglass",
            "Smart Documentation",
            "Generate care notes, billing codes, and contracts from your recordings — no manual entry."
        ),
        (
            "chart.bar.xaxis.ascending",
            "Grow Your Practice",
            "Track clients, manage visits, and stay on top of your home care business effortlessly."
        ),
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                // Dark teal background (matches web login left panel)
                Color.palmPrimaryDark
                    .ignoresSafeArea()
                
                // Subtle blur orbs
                Circle()
                    .fill(Color.white.opacity(0.05))
                    .frame(width: 200, height: 200)
                    .blur(radius: 60)
                    .offset(x: 100, y: -150)
                Circle()
                    .fill(Color.white.opacity(0.05))
                    .frame(width: 180, height: 180)
                    .blur(radius: 50)
                    .offset(x: -80, y: 200)
                
                // Ambient waveform layer (background)
                VStack {
                    Spacer()
                    AnimatedWaveform(barCount: 40, barWidth: 3, minHeight: 4, maxHeight: 24, color: Color.white.opacity(0.15))
                        .padding(.horizontal, 20)
                        .padding(.bottom, 120)
                }
                
                VStack(spacing: 0) {
                    // Logo & branding with pulsing rings
                    HStack(spacing: 12) {
                        ZStack {
                            PulsingGlowRing(color: Color.palmPrimaryLight.opacity(0.6), size: 70)
                            PulsingGlowRing(color: Color.palmAccent.opacity(0.4), size: 56)
                                .scaleEffect(0.9)
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white.opacity(0.2))
                                .frame(width: 48, height: 48)
                            Image(systemName: "hand.raised.fill")
                                .font(.system(size: 22))
                                .foregroundColor(.white)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("PalmCare AI")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.white)
                            HStack(spacing: 4) {
                                AIProcessingDots(color: Color.palmPrimaryLight)
                                Text("AI-Powered")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                    }
                    .padding(.top, 20)
                    .padding(.bottom, 8)
                    
                    Text("Turn care assessments into proposal-ready contracts")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.85))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 24)
                    
                    // Swipeable feature cards
                    TabView(selection: $currentPage) {
                        ForEach(0..<pages.count, id: \.self) { index in
                            OnboardingCard(
                                icon: pages[index].icon,
                                title: pages[index].title,
                                subtitle: pages[index].subtitle,
                                showWaveform: index == 0,
                                showAIDots: index == 1
                            )
                            .tag(index)
                        }
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                    .animation(.easeInOut(duration: 0.3), value: currentPage)
                    
                    // Page indicators
                    HStack(spacing: 8) {
                        ForEach(0..<pages.count, id: \.self) { index in
                            Capsule()
                                .fill(index == currentPage ? Color.white : Color.white.opacity(0.3))
                                .frame(width: index == currentPage ? 24 : 8, height: 8)
                                .animation(.easeInOut(duration: 0.25), value: currentPage)
                        }
                    }
                    .padding(.vertical, 28)
                    
                    // CTA buttons
                    VStack(spacing: 12) {
                        Button {
                            navigateToRegister = true
                        } label: {
                            Text("Get Started")
                                .font(.body.weight(.semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(LinearGradient.palmPrimary)
                                .cornerRadius(14)
                                .shadow(color: Color.palmPrimary.opacity(0.4), radius: 12, y: 4)
                        }
                        
                        Button {
                            navigateToLogin = true
                        } label: {
                            Text("I already have an account")
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.white.opacity(0.9))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.white.opacity(0.12))
                                .cornerRadius(14)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
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

struct OnboardingCard: View {
    let icon: String
    let title: String
    let subtitle: String
    var showWaveform: Bool = false
    var showAIDots: Bool = false

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 80, height: 80)
                
                RoundedRectangle(cornerRadius: 16)
                    .fill(LinearGradient.palmPrimary)
                    .frame(width: 64, height: 64)
                
                Image(systemName: icon)
                    .font(.system(size: 28, weight: .medium))
                    .foregroundColor(.white)
            }
            
            // Waveform animation for Record card
            if showWaveform {
                AnimatedWaveform(barCount: 20, barWidth: 4, minHeight: 12, maxHeight: 32, color: Color.palmPrimaryLight)
                    .frame(height: 36)
                    .padding(.horizontal, 24)
            }
            
            // AI processing dots for Smart Documentation card
            if showAIDots {
                HStack(spacing: 6) {
                    AIProcessingDots(color: Color.palmPrimaryLight)
                    Text("Processing...")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding(.vertical, 4)
            }
            
            VStack(spacing: 10) {
                Text(title)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 20)
            }
        }
        .padding(.horizontal, 32)
    }
}

#Preview {
    LandingView()
        .environmentObject(APIService.shared)
}
