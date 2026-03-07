import SwiftUI

struct PalmAlert: View {
    let title: String
    let message: String
    let icon: String
    let iconColor: Color
    var primaryButton: PalmAlertButton
    var secondaryButton: PalmAlertButton?

    @Binding var isPresented: Bool

    struct PalmAlertButton {
        let title: String
        let style: ButtonStyle
        let action: () -> Void

        enum ButtonStyle {
            case primary, destructive, cancel
        }
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation(.spring(response: 0.3)) { isPresented = false }
                }
                .accessibilityLabel("Dismiss")
                .accessibilityAddTraits(.isButton)

            VStack(spacing: 0) {
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(iconColor.opacity(0.12))
                            .frame(width: 56, height: 56)
                        Image(systemName: icon)
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(iconColor)
                            .accessibilityHidden(true)
                    }
                    .padding(.top, 8)

                    Text(title)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.palmText)
                        .multilineTextAlignment(.center)

                    Text(message)
                        .font(.system(size: 14))
                        .foregroundColor(.palmSecondary)
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 20)

                Divider()

                HStack(spacing: 0) {
                    if let secondary = secondaryButton {
                        Button {
                            withAnimation(.spring(response: 0.3)) { isPresented = false }
                            secondary.action()
                        } label: {
                            Text(secondary.title)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.palmSecondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                        }

                        Divider()
                            .frame(height: 44)
                    }

                    Button {
                        withAnimation(.spring(response: 0.3)) { isPresented = false }
                        primaryButton.action()
                    } label: {
                        Text(primaryButton.title)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(buttonColor(primaryButton.style))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                    }
                }
            }
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.15), radius: 20, y: 10)
            .padding(.horizontal, 44)
            .transition(.scale(scale: 0.85).combined(with: .opacity))
            .accessibilityAddTraits(.isModal)
            .accessibilityLabel("Alert: \(title)")
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: isPresented)
    }

    private func buttonColor(_ style: PalmAlertButton.ButtonStyle) -> Color {
        switch style {
        case .primary: return .palmPrimary
        case .destructive: return .red
        case .cancel: return .palmSecondary
        }
    }
}

extension View {
    func palmAlert(
        _ title: String,
        message: String,
        icon: String = "exclamationmark.triangle.fill",
        iconColor: Color = .palmOrange,
        isPresented: Binding<Bool>,
        primaryButton: PalmAlert.PalmAlertButton,
        secondaryButton: PalmAlert.PalmAlertButton? = nil
    ) -> some View {
        ZStack {
            self

            if isPresented.wrappedValue {
                PalmAlert(
                    title: title,
                    message: message,
                    icon: icon,
                    iconColor: iconColor,
                    primaryButton: primaryButton,
                    secondaryButton: secondaryButton,
                    isPresented: isPresented
                )
                .zIndex(999)
            }
        }
    }

    func palmErrorAlert(
        _ title: String = "Error",
        message: Binding<String?>,
        isPresented: Binding<Bool>
    ) -> some View {
        palmAlert(
            title,
            message: message.wrappedValue ?? "An unexpected error occurred.",
            icon: "xmark.circle.fill",
            iconColor: .red,
            isPresented: isPresented,
            primaryButton: .init(title: "OK", style: .primary, action: {})
        )
    }

    func palmConfirmAlert(
        _ title: String,
        message: String,
        icon: String = "exclamationmark.triangle.fill",
        iconColor: Color = .palmOrange,
        isPresented: Binding<Bool>,
        confirmTitle: String = "Confirm",
        confirmStyle: PalmAlert.PalmAlertButton.ButtonStyle = .destructive,
        onConfirm: @escaping () -> Void
    ) -> some View {
        palmAlert(
            title,
            message: message,
            icon: icon,
            iconColor: iconColor,
            isPresented: isPresented,
            primaryButton: .init(title: confirmTitle, style: confirmStyle, action: onConfirm),
            secondaryButton: .init(title: "Cancel", style: .cancel, action: {})
        )
    }
}
