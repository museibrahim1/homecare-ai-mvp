import SwiftUI

// MARK: - PalmCare AI Brand Colors
// Source: PalmCare_Brand_Guidelines.pdf (official)
// Primary: Teal 500 #0d9488, Accent: Cyan #0891b2

extension Color {
    // Teal scale (primary brand)
    static let palmTeal50 = Color(red: 240/255, green: 253/255, blue: 250/255)    // #F0FDFA
    static let palmTeal100 = Color(red: 204/255, green: 251/255, blue: 241/255)   // #CCFBF1
    static let palmTeal200 = Color(red: 153/255, green: 246/255, blue: 228/255)   // #99F6E4
    static let palmTeal300 = Color(red: 94/255, green: 234/255, blue: 212/255)    // #5EEAD4
    static let palmPrimaryLight = Color(red: 45/255, green: 212/255, blue: 191/255) // #2DD4BF Teal 400
    static let palmPrimary = Color(red: 13/255, green: 148/255, blue: 136/255)    // #0D9488 Teal 500 — MAIN
    static let palmTeal600 = Color(red: 15/255, green: 118/255, blue: 110/255)    // #0F766E
    static let palmPrimaryDark = Color(red: 17/255, green: 94/255, blue: 89/255)  // #115E59 Teal 700
    static let palmTeal800 = Color(red: 19/255, green: 78/255, blue: 74/255)      // #134E4A
    static let palmTeal900 = Color(red: 4/255, green: 47/255, blue: 46/255)       // #042F2E

    // Accent
    static let palmAccent = Color(red: 8/255, green: 145/255, blue: 178/255)      // #0891B2 Cyan

    // Status colors (from brand guidelines)
    static let palmBlue = Color(red: 59/255, green: 130/255, blue: 246/255)       // #3B82F6 Info/processing
    static let palmGreen = Color(red: 5/255, green: 150/255, blue: 105/255)       // #059669 Success/complete
    static let palmOrange = Color(red: 217/255, green: 119/255, blue: 6/255)      // #D97706 Warning/pending
    static let palmPink = Color(red: 219/255, green: 39/255, blue: 119/255)       // #DB2777 Highlights
    static let palmPurple = Color(red: 124/255, green: 58/255, blue: 237/255)     // #7C3AED Feature accents

    // Neutrals (slate)
    static let palmFieldBg = Color(red: 248/255, green: 250/255, blue: 252/255)   // #F8FAFC Slate 50
    static let palmBackground = Color(red: 241/255, green: 245/255, blue: 249/255) // #F1F5F9 Slate 100
    static let palmBorder = Color(red: 226/255, green: 232/255, blue: 240/255)    // #E2E8F0 Slate 200
    static let palmSecondary = Color(red: 100/255, green: 116/255, blue: 139/255) // #64748B Slate 500
    static let palmTextMuted = Color(red: 71/255, green: 85/255, blue: 105/255)   // #475569 Slate 600
    static let palmText = Color(red: 15/255, green: 23/255, blue: 42/255)         // #0F172A Slate 900

    // Legacy alias
    static let palmTeal = palmPrimary
}

// Brand Guidelines gradients
extension LinearGradient {
    // Brand gradient: teal → cyan (logo bg, CTA banners)
    static let palmPrimary = LinearGradient(
        colors: [Color.palmPrimary, Color.palmAccent],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Primary button gradient: teal 500 → teal 600
    static let palmButton = LinearGradient(
        colors: [Color.palmPrimary, Color.palmTeal600],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // Vertical dark gradient
    static let palmPrimaryVertical = LinearGradient(
        colors: [Color.palmPrimary, Color.palmPrimaryDark],
        startPoint: .top,
        endPoint: .bottom
    )
}
