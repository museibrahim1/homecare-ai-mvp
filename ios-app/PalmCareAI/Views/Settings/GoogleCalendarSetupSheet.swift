import SwiftUI
import AuthenticationServices

struct GoogleCalendarSetupSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss
    @Binding var isConnected: Bool

    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showDisconnectConfirm = false

    private let googleClientId = "668945369325-lrmdd9q1d6m7ggojiqvporj8frqso31j.apps.googleusercontent.com"
    private let callbackScheme = "com.palmcare.ai"
    private let scopes = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"

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
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 13))
                                .foregroundColor(.palmOrange)
                            Text(error)
                                .font(.system(size: 13))
                                .foregroundColor(.palmText)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.palmOrange.opacity(0.08))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmOrange.opacity(0.2), lineWidth: 1))
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
                        .foregroundColor(.palmPrimary)
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
                startGoogleOAuth()
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
                .shadow(color: Color.palmBlue.opacity(0.3), radius: 6, y: 3)
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

    // MARK: - Google OAuth via ASWebAuthenticationSession

    private func startGoogleOAuth() {
        isLoading = true
        errorMessage = nil

        let redirectURI = "\(callbackScheme):/oauth2callback"
        let encodedRedirectURI = redirectURI.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? redirectURI
        let encodedScopes = scopes.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? scopes

        let authURLString = "https://accounts.google.com/o/oauth2/v2/auth"
            + "?client_id=\(googleClientId)"
            + "&redirect_uri=\(encodedRedirectURI)"
            + "&response_type=code"
            + "&scope=\(encodedScopes)"
            + "&access_type=offline"
            + "&prompt=consent"

        guard let authURL = URL(string: authURLString) else {
            isLoading = false
            errorMessage = "Failed to build authentication URL."
            return
        }

        let session = ASWebAuthenticationSession(url: authURL, callbackURLScheme: callbackScheme) { callbackURL, error in
            DispatchQueue.main.async {
                if let error = error {
                    self.isLoading = false
                    if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        return
                    }
                    self.errorMessage = "Authentication failed: \(error.localizedDescription)"
                    return
                }

                guard let callbackURL = callbackURL,
                      let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                      let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                    self.isLoading = false
                    self.errorMessage = "Failed to get authorization code from Google."
                    return
                }

                Task {
                    await self.exchangeCodeForTokens(code: code, redirectURI: redirectURI)
                }
            }
        }

        session.prefersEphemeralWebBrowserSession = false
        session.presentationContextProvider = GoogleAuthPresentationContext.shared
        session.start()
    }

    private func exchangeCodeForTokens(code: String, redirectURI: String) async {
        do {
            let body: [String: Any] = [
                "code": code,
                "redirect_uri": redirectURI
            ]
            let _: [String: AnyCodable] = try await api.request("POST", path: "/calendar/connect", body: body)
            await MainActor.run {
                isConnected = true
                isLoading = false
                errorMessage = nil
            }
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = "Failed to connect calendar: \(error.localizedDescription)"
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

// Provides the presentation anchor for ASWebAuthenticationSession
private class GoogleAuthPresentationContext: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = GoogleAuthPresentationContext()

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else {
            return ASPresentationAnchor()
        }
        return window
    }
}
