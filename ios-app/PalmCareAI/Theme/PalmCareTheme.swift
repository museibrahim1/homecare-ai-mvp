import SwiftUI

// MARK: - PalmCare AI Brand Colors (matches webapp)
// Primary: teal #0d9488, Accent: cyan #0891b2
// From apps/web/tailwind.config.js & globals.css

extension Color {
    // Primary brand - teal
    static let palmPrimary = Color(red: 13/255, green: 148/255, blue: 136/255)      // #0d9488
    static let palmPrimaryDark = Color(red: 17/255, green: 94/255, blue: 89/255)   // #115e59 primary-700
    static let palmPrimaryLight = Color(red: 45/255, green: 212/255, blue: 191/255) // #2dd4bf primary-400
    
    // Accent - cyan
    static let palmAccent = Color(red: 8/255, green: 145/255, blue: 178/255)        // #0891b2
    
    // Neutrals (slate scale)
    static let palmText = Color(red: 15/255, green: 23/255, blue: 42/255)          // #0f172a slate-900
    static let palmTextMuted = Color(red: 71/255, green: 85/255, blue: 105/255)     // #475569 slate-600
    static let palmSecondary = Color(red: 100/255, green: 116/255, blue: 139/255)   // #64748b slate-500
    static let palmFieldBg = Color(red: 248/255, green: 250/255, blue: 252/255)     // #f8fafc slate-50
    static let palmBorder = Color(red: 226/255, green: 232/255, blue: 240/255)     // #e2e8f0 slate-200
    static let palmBackground = Color(red: 241/255, green: 245/255, blue: 249/255) // #f1f5f9 slate-100
    
    // Legacy alias
    static let palmTeal = palmPrimary
}

// Gradient matching webapp: from-primary-500 to-accent-cyan
extension LinearGradient {
    static let palmPrimary = LinearGradient(
        colors: [Color.palmPrimary, Color.palmAccent],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let palmPrimaryVertical = LinearGradient(
        colors: [Color.palmPrimary, Color.palmPrimaryDark],
        startPoint: .top,
        endPoint: .bottom
    )
}
