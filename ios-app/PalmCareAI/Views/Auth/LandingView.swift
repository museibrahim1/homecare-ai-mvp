import SwiftUI

struct LandingView: View {
    @EnvironmentObject var api: APIService
    @State private var currentPage = 0
    @State private var navigateToLogin = false
    @State private var navigateToRegister = false

    private let pages: [(icon: String, title: String, subtitle: String, color: Color)] = [
        (
            "waveform.and.mic",
            "Record & Transcribe",
            "Capture client visits with one tap. AI transcribes and organizes everything automatically.",
            .palmPrimary
        ),
        (
            "doc.text.magnifyingglass",
            "Smart Documentation",
            "Generate care notes, billing codes, and contracts from your recordings — no manual entry.",
            .palmTeal
        ),
        (
            "chart.bar.xaxis.ascending",
            "Grow Your Practice",
            "Track clients, manage visits, and stay on top of your home care business effortlessly.",
            Color(red: 124/255, green: 58/255, blue: 237/255)
        ),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Pages
                TabView(selection: $currentPage) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        OnboardingPage(
                            icon: pages[index].icon,
                            title: pages[index].title,
                            subtitle: pages[index].subtitle,
                            accentColor: pages[index].color
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
                            .fill(index == currentPage ? Color.palmPrimary : Color.palmBorder)
                            .frame(width: index == currentPage ? 24 : 8, height: 8)
                            .animation(.easeInOut(duration: 0.25), value: currentPage)
                    }
                }
                .padding(.bottom, 40)

                // Buttons
                VStack(spacing: 14) {
                    Button {
                        navigateToRegister = true
                    } label: {
                        Text("Get Started")
                            .font(.body.weight(.semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.palmPrimary)
                            .cornerRadius(14)
                    }

                    Button {
                        navigateToLogin = true
                    } label: {
                        Text("I already have an account")
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(.palmPrimary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.palmPrimary.opacity(0.08))
                            .cornerRadius(14)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 48)
            }
            .background(Color.white)
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

struct OnboardingPage: View {
    let icon: String
    let title: String
    let subtitle: String
    let accentColor: Color

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            ZStack {
                Circle()
                    .fill(accentColor.opacity(0.08))
                    .frame(width: 180, height: 180)

                Circle()
                    .fill(accentColor.opacity(0.15))
                    .frame(width: 130, height: 130)

                Image(systemName: icon)
                    .font(.system(size: 52, weight: .medium))
                    .foregroundColor(accentColor)
            }

            VStack(spacing: 14) {
                Text(title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.palmText)
                    .multilineTextAlignment(.center)

                Text(subtitle)
                    .font(.body)
                    .foregroundColor(.palmSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 16)
            }

            Spacer()
            Spacer()
        }
        .padding(.horizontal, 24)
    }
}

#Preview {
    LandingView()
        .environmentObject(APIService.shared)
}
