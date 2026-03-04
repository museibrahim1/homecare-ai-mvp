import SwiftUI

// MARK: - Local plan data (fallback when API unavailable)

struct LocalPlan: Identifiable {
    let id: String
    let name: String
    let runs: String
    let priceMonthly: String
    let isPopular: Bool
}

private let hardcodedPlans: [LocalPlan] = [
    LocalPlan(id: "starter", name: "Starter", runs: "15", priceMonthly: "$199", isPopular: false),
    LocalPlan(id: "growth", name: "Growth", runs: "25", priceMonthly: "$349", isPopular: true),
    LocalPlan(id: "pro", name: "Pro", runs: "50", priceMonthly: "$599", isPopular: false),
]

// MARK: - Subscription View

struct SubscriptionView: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var remotePlans: [SubscriptionPlan] = []
    @State private var selectedPlanIndex: Int = 1
    @State private var isLoading = false
    @State private var checkoutLoading: String?
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            Color(red: 12/255, green: 12/255, blue: 14/255)
                .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    header
                    usageBanner
                    planCards
                    enterpriseCard
                    footerNote
                }
                .padding(.bottom, 40)
            }
        }
        .task { await loadPlans() }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 12) {
            HStack {
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white.opacity(0.5))
                        .frame(width: 36, height: 36)
                        .background(Color.white.opacity(0.08))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)

            Image(systemName: "bolt.shield.fill")
                .font(.system(size: 44))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color.palmPrimary, Color.palmAccent],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .padding(.top, 8)

            Text("Upgrade Your Plan")
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(.white)

            Text("Unlock more assessments and grow your practice")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .padding(.bottom, 24)
    }

    // MARK: - Usage Banner

    private var usageBanner: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.1), lineWidth: 4)
                    .frame(width: 44, height: 44)
                Circle()
                    .trim(from: 0, to: 1.0)
                    .stroke(Color.palmOrange, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .frame(width: 44, height: 44)
                    .rotationEffect(.degrees(-90))
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.palmOrange)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Plan Limit Reached")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text("Choose a plan below to continue running assessments")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))
            }

            Spacer()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.palmOrange.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.palmOrange.opacity(0.2), lineWidth: 1)
                )
        )
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
    }

    // MARK: - Plan Cards

    private var planCards: some View {
        let displayPlans: [(id: String, name: String, runs: String, price: String, isPopular: Bool)] = {
            if !remotePlans.isEmpty {
                return remotePlans.filter { !$0.isEnterprise }.map { plan in
                    (
                        id: plan.id,
                        name: plan.name,
                        runs: plan.max_users.map { "\($0)" } ?? "∞",
                        price: plan.displayPrice,
                        isPopular: plan.tier?.lowercased() == "growth"
                    )
                }
            }
            return hardcodedPlans.map { (id: $0.id, name: $0.name, runs: $0.runs, price: $0.priceMonthly, isPopular: $0.isPopular) }
        }()

        return VStack(spacing: 12) {
            ForEach(Array(displayPlans.enumerated()), id: \.element.id) { index, plan in
                PlanCard(
                    plan: LocalPlan(id: plan.id, name: plan.name, runs: plan.runs, priceMonthly: plan.price, isPopular: plan.isPopular),
                    isSelected: selectedPlanIndex == index,
                    isCheckingOut: checkoutLoading == plan.id,
                    onSelect: { selectedPlanIndex = index },
                    onSubscribe: { await subscribe(planId: plan.id, planName: plan.name) }
                )
            }
        }
        .padding(.horizontal, 20)
    }

    // MARK: - Enterprise Card

    private var enterpriseCard: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "building.2.fill")
                    .font(.system(size: 20))
                    .foregroundColor(.palmAccent)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Enterprise")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text("Unlimited runs · Custom pricing · Dedicated support")
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.5))
                }

                Spacer()

                Button {
                    if let url = URL(string: "mailto:sales@palmtechnologies.co?subject=Enterprise%20Plan%20Inquiry") {
                        openURL(url)
                    }
                } label: {
                    Text("Contact Sales")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.palmPrimary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color.palmPrimary.opacity(0.12))
                        .cornerRadius(20)
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
            )
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
    }

    // MARK: - Footer

    private var footerNote: some View {
        VStack(spacing: 6) {
            Text("All plans billed monthly · Cancel anytime")
                .font(.system(size: 11))
                .foregroundColor(.white.opacity(0.3))
            if let error = errorMessage {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.red.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
        }
        .padding(.top, 20)
    }

    // MARK: - Actions

    private func loadPlans() async {
        do {
            remotePlans = try await api.fetchPlans()
        } catch {
            // Use hardcoded plans as fallback
        }
    }

    private func subscribe(planId: String, planName: String) async {
        checkoutLoading = planId

        do {
            let checkout = try await api.createCheckout(planId: planId)
            if let url = URL(string: checkout.checkout_url) {
                await MainActor.run { openURL(url) }
            }
        } catch {
            await MainActor.run {
                errorMessage = "Could not start checkout. Please try again."
            }
        }

        await MainActor.run { checkoutLoading = nil }
    }
}

// MARK: - Plan Card

struct PlanCard: View {
    let plan: LocalPlan
    let isSelected: Bool
    let isCheckingOut: Bool
    let onSelect: () -> Void
    let onSubscribe: () async -> Void

    var body: some View {
        VStack(spacing: 0) {
            if plan.isPopular {
                HStack {
                    Spacer()
                    Label("Most Popular", systemImage: "star.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(
                            LinearGradient(
                                colors: [Color.palmPrimary, Color.palmAccent],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(10, corners: [.bottomLeft])
                        .cornerRadius(10, corners: [.topRight])
                }
            }

            HStack(alignment: .top, spacing: 14) {
                Button { onSelect() } label: {
                    ZStack {
                        Circle()
                            .stroke(isSelected ? Color.palmPrimary : Color.white.opacity(0.2), lineWidth: 2)
                            .frame(width: 22, height: 22)
                        if isSelected {
                            Circle()
                                .fill(Color.palmPrimary)
                                .frame(width: 14, height: 14)
                        }
                    }
                }
                .padding(.top, 2)

                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(plan.name)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)

                        Text("\(plan.runs) runs/mo")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.palmPrimary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color.palmPrimary.opacity(0.12))
                            .cornerRadius(8)
                    }

                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(plan.priceMonthly)
                            .font(.system(size: 28, weight: .heavy))
                            .foregroundColor(.white)
                        Text("/ month")
                            .font(.system(size: 13))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)

            if isSelected {
                Button {
                    Task { await onSubscribe() }
                } label: {
                    HStack(spacing: 8) {
                        if isCheckingOut {
                            ProgressView().tint(.white).scaleEffect(0.8)
                        } else {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 16))
                        }
                        Text("Subscribe to \(plan.name)")
                            .font(.system(size: 15, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [Color.palmPrimary, Color.palmTeal600],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(14)
                }
                .disabled(isCheckingOut)
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(isSelected ? Color.palmPrimary.opacity(0.06) : Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(
                            isSelected ? Color.palmPrimary.opacity(0.4) : Color.white.opacity(0.08),
                            lineWidth: isSelected ? 1.5 : 1
                        )
                )
        )
        .onTapGesture { onSelect() }
        .animation(.easeInOut(duration: 0.2), value: isSelected)
    }
}

// MARK: - Corner Radius Helper

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
