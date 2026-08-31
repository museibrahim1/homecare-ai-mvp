import SwiftUI

// MARK: - Pipeline Glass tokens (Paper App Glass + Night)

extension Color {
    /// Mint wash ground from App Glass (`#E7F1EF`).
    static let palmMintWash = Color(red: 231 / 255, green: 241 / 255, blue: 239 / 255)
    /// Soft orb glow A (`#7ED4C8`).
    static let palmGlowTeal = Color(red: 126 / 255, green: 212 / 255, blue: 200 / 255)
    /// Soft orb glow B (`#B8E0D8`).
    static let palmGlowMint = Color(red: 184 / 255, green: 224 / 255, blue: 216 / 255)
    /// Frosted card fill (~62% white).
    static let palmGlassFill = Color.white.opacity(0.62)
    /// Stronger frost for tab chrome (~62% → 0.62, design uses ~0x9E).
    static let palmGlassChrome = Color.white.opacity(0.62)
    /// Hairline on glass (`#FFFFFF` ~92%).
    static let palmGlassBorder = Color.white.opacity(0.92)

    // App Glass ink + muted text (Paper App Glass, day/light only). The app
    // forces `.light` on these screens, so these are fixed hex, not adaptive.
    /// Heading ink (`#10211F`).
    static let palmInk = Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255)
    /// Value ink (`#111827`).
    static let palmInkSlate = Color(red: 17 / 255, green: 24 / 255, blue: 39 / 255)
    /// Subtitle / eyebrow sage (`#4B6B66`).
    static let palmSage = Color(red: 75 / 255, green: 107 / 255, blue: 102 / 255)
    /// Stat / field label slate (`#6B7280`).
    static let palmSlateLabel = Color(red: 107 / 255, green: 114 / 255, blue: 128 / 255)
    /// Muted body / detail value (`#64748B`).
    static let palmGlassMuted = Color(red: 100 / 255, green: 116 / 255, blue: 139 / 255)
    /// Hint / placeholder (`#94A3B8`).
    static let palmHint = Color(red: 148 / 255, green: 163 / 255, blue: 184 / 255)
    /// Calendar day / detail slate (`#334155`).
    static let palmDetailSlate = Color(red: 51 / 255, green: 65 / 255, blue: 85 / 255)
    /// Chevron / hairline gray (`#CBD5E1`).
    static let palmChevron = Color(red: 203 / 255, green: 213 / 255, blue: 225 / 255)
    /// Inactive tab icon sage-gray (`#7A8C88`).
    static let palmTabInactive = Color(red: 122 / 255, green: 140 / 255, blue: 136 / 255)

    // Night glass (Paper Scratchpad A — Settings / Home Night)
    /// Deep night ground (`#0B1014`).
    static let palmNightWash = Color(red: 11 / 255, green: 16 / 255, blue: 20 / 255)
    /// Night glow A (`#1A6B63`).
    static let palmNightGlowTeal = Color(red: 26 / 255, green: 107 / 255, blue: 99 / 255)
    /// Night glow B (`#0E3A48`).
    static let palmNightGlowDeep = Color(red: 14 / 255, green: 58 / 255, blue: 72 / 255)
    /// Night frost card (`#FFFFFF` ~8% / `14` hex).
    static let palmNightGlassFill = Color.white.opacity(0.08)
    /// Night card hairline (`#FFFFFF` ~12% / `1F` hex).
    static let palmNightGlassBorder = Color.white.opacity(0.12)
    /// Night tab chrome hairline (`#FFFFFF` ~14% / `24` hex).
    static let palmNightChromeBorder = Color.white.opacity(0.14)
    /// Night primary ink (`#F4FFFC`).
    static let palmNightText = Color(red: 244 / 255, green: 255 / 255, blue: 252 / 255)
    /// Night muted ink (`#8BA8A3`).
    static let palmNightSecondary = Color(red: 139 / 255, green: 168 / 255, blue: 163 / 255)
}

enum PalmGlass {
    static let cardRadius: CGFloat = 28
    static let chipRadius: CGFloat = 24
    static let tabRadius: CGFloat = 32
    static let shadow = Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255).opacity(0.08)
    static let nightShadow = Color.black.opacity(0.28)
    static let tealShadow = Color.palmPrimary.opacity(0.28)
}

// MARK: - Mint wash / night wash + soft orbs

struct PalmGlassBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Group {
            if colorScheme == .dark {
                nightWash
            } else {
                dayWash
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }

    private var dayWash: some View {
        ZStack {
            Color.palmMintWash
            Circle()
                .fill(Color.palmGlowTeal.opacity(0.45))
                .frame(width: 280, height: 280)
                .blur(radius: 80)
                .offset(x: 110, y: -220)
            Circle()
                .fill(Color.palmGlowMint.opacity(0.7))
                .frame(width: 180, height: 180)
                .blur(radius: 72)
                .offset(x: -130, y: 260)
        }
    }

    /// Matches Paper Login/Settings Night after wash soften: ground `#0B1014`
    /// with near-invisible ambient orbs (opacity 0.08 / 0.10).
    private var nightWash: some View {
        ZStack {
            Color.palmNightWash
            Circle()
                .fill(Color.palmNightGlowTeal.opacity(0.08))
                .frame(width: 240, height: 240)
                .blur(radius: 80)
                .offset(x: -120, y: 220)
            Circle()
                .fill(Color.palmNightGlowDeep.opacity(0.10))
                .frame(width: 220, height: 220)
                .blur(radius: 76)
                .offset(x: 140, y: 420)
        }
    }
}

// MARK: - Shared glass card chrome

struct PalmGlassCardModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    var radius: CGFloat = PalmGlass.cardRadius
    /// Day frost opacity only. Night always uses Paper `#FFFFFF14`.
    var fillOpacity: Double = 0.62
    var padding: CGFloat? = nil

    private var isNight: Bool { colorScheme == .dark }

    func body(content: Content) -> some View {
        content
            .padding(padding ?? 0)
            .background {
                // Avoid .ultraThinMaterial on scrolling list cells — live backdrop
                // blur per row causes the lag users report on Clients/Home.
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(isNight ? Color.palmNightGlassFill : Color.white.opacity(max(fillOpacity, 0.88)))
            }
            .overlay(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(
                        isNight ? Color.palmNightGlassBorder : Color.palmGlassBorder,
                        lineWidth: 1
                    )
            )
            .shadow(
                color: isNight ? PalmGlass.nightShadow : PalmGlass.shadow,
                radius: isNight ? 12 : 8,
                y: isNight ? 14 : 12
            )
    }
}

extension View {
    /// Frosted glass surface matching Paper App Glass (day) or Night cards.
    func palmGlassCard(
        radius: CGFloat = PalmGlass.cardRadius,
        fillOpacity: Double = 0.62,
        padding: CGFloat = 0
    ) -> some View {
        modifier(PalmGlassCardModifier(radius: radius, fillOpacity: fillOpacity, padding: padding))
    }

    /// Full-screen mint / night wash behind any App / Pipeline / Auth glass screen.
    func palmGlassScreen() -> some View {
        background { PalmGlassBackground() }
    }

    /// Soft field on glass forms (Login / Sign up / Add Client).
    func palmGlassField(focused: Bool = false) -> some View {
        modifier(PalmGlassFieldModifier(focused: focused))
    }
}

private struct PalmGlassFieldModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    var focused: Bool

    func body(content: Content) -> some View {
        let isNight = colorScheme == .dark
        content
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(isNight ? Color.white.opacity(0.1) : Color.white.opacity(0.85))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(
                        focused
                            ? Color.palmPrimary.opacity(0.55)
                            : (isNight ? Color.palmNightGlassBorder : Color.palmBorder.opacity(0.8)),
                        lineWidth: 1
                    )
            )
    }
}

/// Uppercase eyebrow label used across Paper glass forms.
struct PalmGlassLabel: View {
    @Environment(\.colorScheme) private var colorScheme
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold))
            .tracking(0.8)
            .foregroundColor(colorScheme == .dark ? .palmNightSecondary : .palmSecondary)
    }
}

/// App Glass section eyebrow: 12px semibold uppercase, sage `#4B6B66`,
/// tracking 0.06em (Paper Contact / Preferences / Care details headers).
struct PalmSectionEyebrow: View {
    @Environment(\.colorScheme) private var colorScheme
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 12, weight: .semibold))
            .tracking(0.72)
            .foregroundColor(colorScheme == .dark ? .palmNightSecondary : .palmSage)
    }
}

/// Five-bar waveform mark used on the Home "Palm It Now" CTA
/// (Paper heights 9/17/24/14/8, 3pt bars, 3pt gaps).
struct PalmWaveformBars: View {
    var color: Color = .white
    private let heights: [CGFloat] = [9, 17, 24, 14, 8]
    var body: some View {
        HStack(spacing: 3) {
            ForEach(Array(heights.enumerated()), id: \.offset) { _, h in
                Capsule(style: .continuous)
                    .fill(color)
                    .frame(width: 3, height: h)
            }
        }
        .frame(width: 40, height: 40)
        .accessibilityHidden(true)
    }
}

/// Status pill for Pipeline Glass checklists (Ready / Writing / Next / Failed).
/// Used on the Overview processing checklist and the Record processing overlay.
struct PalmPipelinePill: View {
    let text: String
    let color: Color
    var showsSpinner: Bool = false

    var body: some View {
        HStack(spacing: 4) {
            if showsSpinner {
                ProgressView()
                    .scaleEffect(0.55)
                    .tint(color)
            }
            Text(text.uppercased())
                .font(.system(size: 10, weight: .bold))
                .tracking(0.5)
        }
        .foregroundColor(color)
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(Capsule(style: .continuous).fill(color.opacity(0.14)))
    }
}
