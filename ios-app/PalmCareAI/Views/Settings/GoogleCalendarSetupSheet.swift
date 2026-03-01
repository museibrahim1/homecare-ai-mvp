import SwiftUI
import AuthenticationServices

struct GoogleCalendarSetupSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss
    @Binding var isConnected: Bool

    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showDisconnectConfirm = false
    @State private var didStartAuth = false

    private let googleClientId = "668945369325-lrmdd9q1d6m7ggojiqvporj8frqso31j.apps.googleusercontent.com"
    private let callbackScheme = "com.palmcare.ai"
    private let scopes = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
    private let apiBaseURL = "https://api-production-a0a2.up.railway.app"

    var body: some View {
        NavigationStack {
            Group {
                if isConnected {
                    connectedContent
                } else if isLoading {
                    loadingContent
                } else if let error = errorMessage {
                    errorContent(error)
                } else {
                    loadingContent
                }
            }
            .background(Color.palmBackground)
            .navigationTitle(isConnected ? "Google Calendar" : "Connecting...")
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
            .onAppear {
                if !isConnected && !didStartAuth {
                    didStartAuth = true
                    startGoogleOAuth()
                }
            }
        }
    }

    private var loadingContent: some View {
        VStack(spacing: 16) {
            Spacer()
            ProgressView()
                .scaleEffect(1.2)
            Text("Opening Google Sign-In...")
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.palmSecondary)
            Spacer()
        }
    }

    private func errorContent(_ error: String) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                Spacer().frame(height: 40)

                ZStack {
                    Circle()
                        .fill(Color.palmOrange.opacity(0.1))
                        .frame(width: 72, height: 72)
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 30))
                        .foregroundColor(.palmOrange)
                }

                Text("Connection Failed")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.palmText)

                Text(error)
                    .font(.system(size: 14))
                    .foregroundColor(.palmSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)

                Button {
                    errorMessage = nil
                    startGoogleOAuth()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 14, weight: .bold))
                        Text("Try Again")
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
                .padding(.horizontal, 30)
            }
        }
    }

    private var connectedContent: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer().frame(height: 20)

                ZStack {
                    Circle()
                        .fill(Color.palmGreen.opacity(0.1))
                        .frame(width: 80, height: 80)
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.palmGreen)
                }

                VStack(spacing: 6) {
                    Text("Calendar Connected")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.palmText)

                    Text("Your Google Calendar events are synced with PalmCare.")
                        .font(.system(size: 14))
                        .foregroundColor(.palmSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 30)
                }

                Button {
                    showDisconnectConfirm = true
                } label: {
                    Text("Disconnect Calendar")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.red.opacity(0.06))
                        .cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.red.opacity(0.15), lineWidth: 1))
                }
                .padding(.horizontal, 30)
                .padding(.top, 12)
            }
        }
    }

    // MARK: - Google OAuth

    private func startGoogleOAuth() {
        isLoading = true
        errorMessage = nil

        let redirectURI = "\(apiBaseURL)/calendar/mobile-callback"
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
                        self.dismiss()
                        return
                    }
                    self.errorMessage = "Sign-in was cancelled or failed."
                    return
                }

                guard let callbackURL = callbackURL,
                      let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                      let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
                    self.isLoading = false
                    if let callbackURL = callbackURL,
                       let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                       let errorParam = components.queryItems?.first(where: { $0.name == "error" })?.value {
                        self.errorMessage = "Google returned an error: \(errorParam)"
                    } else {
                        self.errorMessage = "Failed to get authorization code from Google."
                    }
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
                errorMessage = "Connected to Google but failed to save: \(error.localizedDescription)"
            }
        }
    }

    private func disconnectCalendar() {
        Task {
            do {
                try await api.disconnectGoogleCalendar()
                await MainActor.run {
                    isConnected = false
                    dismiss()
                }
            } catch {
                await MainActor.run { errorMessage = error.localizedDescription }
            }
        }
    }
}

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
