import SwiftUI

extension ClientDetailView {
    func loadVisits() async {
        do {
            let fetched = try await api.fetchVisits()
            await MainActor.run {
                visits = fetched
                isLoading = false
            }
        } catch {
            await MainActor.run {
                loadError = error.localizedDescription
                isLoading = false
            }
        }
    }

    var visitsErrorView: some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 36))
                .foregroundColor(.palmOrange)
                .accessibilityHidden(true)
            Text("Something went wrong")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.palmText)
            Text(loadError ?? "")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Button {
                loadError = nil
                Task { await loadVisits() }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12, weight: .bold))
                    Text("Try Again")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.palmPrimary)
                .cornerRadius(10)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }
}
