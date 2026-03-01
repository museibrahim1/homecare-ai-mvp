import SwiftUI
import AuthenticationServices

struct GoogleCalendarSetupSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss
    @Binding var isConnected: Bool

    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showDisconnectConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    headerIcon

                    if isConnected {
                        connectedState
                    } else {
                        disconnectedState
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                }
                .padding(.top, 24)
                .padding(.horizontal, 20)
            }
            .background(Color.palmBackground)
            .navigationTitle("Google Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Disconnect Calendar", isPresented: $showDisconnectConfirm) {
                Button("Disconnect", role: .destructive) { disconnectCalendar() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Your synced events will remain on the device but new events won't sync.")
            }
        }
    }

    private var headerIcon: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.palmBlue.opacity(0.1))
                    .frame(width: 80, height: 80)

                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 32))
                    .foregroundColor(.palmBlue)
            }

            Text("Google Calendar")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.palmText)

            Text("Sync your Google Calendar events with PalmCare to keep your schedule in one place.")
                .font(.system(size: 14))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
    }

    private var disconnectedState: some View {
        VStack(spacing: 16) {
            featureRow(icon: "arrow.triangle.2.circlepath", text: "Two-way sync with Google Calendar")
            featureRow(icon: "bell.fill", text: "Event reminders and notifications")
            featureRow(icon: "person.2.fill", text: "See client appointments alongside events")

            Button {
                connectCalendar()
            } label: {
                HStack(spacing: 8) {
                    if isLoading {
                        ProgressView().tint(.white).scaleEffect(0.8)
                    } else {
                        Image(systemName: "link")
                            .font(.system(size: 14, weight: .bold))
                    }
                    Text("Connect Google Calendar")
                        .font(.system(size: 15, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    LinearGradient(colors: [Color.palmBlue, Color(red: 66/255, green: 133/255, blue: 244/255)],
                                   startPoint: .leading, endPoint: .trailing)
                )
                .cornerRadius(12)
            }
            .disabled(isLoading)
            .padding(.top, 8)
        }
    }

    private var connectedState: some View {
        VStack(spacing: 16) {
            HStack(spacing: 10) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 20))
                    .foregroundColor(.palmGreen)
                Text("Calendar is connected")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.palmText)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.palmGreen.opacity(0.08))
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmGreen.opacity(0.2), lineWidth: 1))

            Text("Events from your Google Calendar are synced to the Workspace calendar.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)

            Button {
                showDisconnectConfirm = true
            } label: {
                Text("Disconnect")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.red.opacity(0.06))
                    .cornerRadius(10)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.red.opacity(0.15), lineWidth: 1))
            }
            .padding(.top, 8)
        }
    }

    private func featureRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.palmPrimary)
                .frame(width: 32, height: 32)
                .background(Color.palmPrimary.opacity(0.1))
                .cornerRadius(8)

            Text(text)
                .font(.system(size: 14))
                .foregroundColor(.palmText)

            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
    }

    private func connectCalendar() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let status = try await api.connectGoogleCalendar()
                await MainActor.run {
                    isConnected = status
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func disconnectCalendar() {
        Task {
            do {
                try await api.disconnectGoogleCalendar()
                await MainActor.run { isConnected = false }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription }
            }
        }
    }
}
