package com.palmtechnologies.palmcareai.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Teal scale — matches iOS PalmCareTheme.swift exactly
val Teal50 = Color(0xFFF0FDFA)
val Teal100 = Color(0xFFCCFBF1)
val Teal200 = Color(0xFF99F6E4)
val Teal300 = Color(0xFF5EEAD4)
val Teal400 = Color(0xFF2DD4BF)   // palmPrimaryLight
val Teal500 = Color(0xFF0D9488)   // palmPrimary — main brand
val Teal600 = Color(0xFF0F766E)   // palmTeal600
val Teal700 = Color(0xFF115E59)   // palmPrimaryDark
val Teal800 = Color(0xFF134E4A)
val Teal900 = Color(0xFF042F2E)

val PalmAccent = Color(0xFF0891B2) // palmAccent (cyan)

// Dark palette
val Dark900 = Color(0xFF0A0A0F)
val Dark800 = Color(0xFF141420)
val Dark700 = Color(0xFF1E1E2E)
val Dark600 = Color(0xFF2A2A3C)
val Dark500 = Color(0xFF3A3A4C)
val Dark400 = Color(0xFF6B6B80)
val Dark300 = Color(0xFF9CA3AF)
val Dark200 = Color(0xFFD1D5DB)
val Dark100 = Color(0xFFF3F4F6)

// Status colors
val ErrorRed = Color(0xFFDC2626)
val SuccessGreen = Color(0xFF059669)
val WarningAmber = Color(0xFFD97706)
val PalmBlue = Color(0xFF3B82F6)
val PalmPurple = Color(0xFF7C3AED)
val PalmPink = Color(0xFFDB2777)

// Gradients matching iOS
val PalmPrimaryGradient = Brush.linearGradient(listOf(Teal500, PalmAccent))
val PalmButtonGradient = Brush.linearGradient(listOf(Teal500, Teal600))
val PalmVerticalGradient = Brush.verticalGradient(listOf(Teal500, Teal700))

// Landing dark gradient stops (iOS LandingView)
val LandingGradient = Brush.verticalGradient(
    listOf(
        Color(0xFF071F20),
        Color(0xFF0A2F2A),
        Color(0xFF0D3D35),
        Color(0xFF082828),
        Color(0xFF051818),
        Color(0xFF030F0F)
    )
)

private val DarkColorScheme = darkColorScheme(
    primary = Teal500,
    onPrimary = Color.White,
    primaryContainer = Teal800,
    onPrimaryContainer = Teal100,
    secondary = Teal400,
    onSecondary = Color.White,
    background = Dark900,
    onBackground = Dark100,
    surface = Dark800,
    onSurface = Dark100,
    surfaceVariant = Dark700,
    onSurfaceVariant = Dark300,
    outline = Dark600,
    error = ErrorRed,
    onError = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = Teal500,
    onPrimary = Color.White,
    primaryContainer = Teal100,
    onPrimaryContainer = Teal900,
    secondary = Teal400,
    onSecondary = Color.White,
    background = Color(0xFFF2F2F7),  // iOS systemGroupedBackground
    onBackground = Color(0xFF000000),
    surface = Color.White,            // iOS secondarySystemGroupedBackground
    onSurface = Color(0xFF000000),    // iOS label
    surfaceVariant = Color(0xFFF2F2F7),
    onSurfaceVariant = Color(0xFF8E8E93), // iOS secondaryLabel
    outline = Color(0xFFC6C6C8),      // iOS separator
    error = ErrorRed,
    onError = Color.White
)

@Composable
fun PalmCareTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = PalmCareTypography,
        content = content
    )
}
