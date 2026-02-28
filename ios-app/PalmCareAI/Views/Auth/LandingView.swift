import SwiftUI

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
                
                VStack(spacing: 0) {
                    // Logo & branding
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white.opacity(0.2))
                                .frame(width: 48, height: 48)
                            Image(systemName: "hand.raised.fill")
                                .font(.system(size: 22))
                                .foregroundColor(.white)
                        }
                        Text("PalmCare AI")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
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
                                subtitle: pages[index].subtitle
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
