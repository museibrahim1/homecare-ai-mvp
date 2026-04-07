package com.palmtechnologies.palmcareai.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

val Teal50 = Color(0xFFF0FDFA)
val Teal100 = Color(0xFFCCFBF1)
val Teal200 = Color(0xFF99F6E4)
val Teal300 = Color(0xFF5EEAD4)
val Teal400 = Color(0xFF2DD4BF)
val Teal500 = Color(0xFF14B8A6)
val Teal600 = Color(0xFF0D9488)
val Teal700 = Color(0xFF0F766E)
val Teal800 = Color(0xFF115E59)
val Teal900 = Color(0xFF134E4A)

val Dark900 = Color(0xFF0A0A0F)
val Dark800 = Color(0xFF141420)
val Dark700 = Color(0xFF1E1E2E)
val Dark600 = Color(0xFF2A2A3C)
val Dark500 = Color(0xFF3A3A4C)
val Dark400 = Color(0xFF6B6B80)
val Dark300 = Color(0xFF9CA3AF)
val Dark200 = Color(0xFFD1D5DB)
val Dark100 = Color(0xFFF3F4F6)

val ErrorRed = Color(0xFFEF4444)
val SuccessGreen = Color(0xFF22C55E)
val WarningAmber = Color(0xFFF59E0B)

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
    primary = Teal600,
    onPrimary = Color.White,
    primaryContainer = Teal100,
    onPrimaryContainer = Teal900,
    secondary = Teal500,
    onSecondary = Color.White,
    background = Color(0xFFF8FAFB),
    onBackground = Color(0xFF1A1A2E),
    surface = Color.White,
    onSurface = Color(0xFF1A1A2E),
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF64748B),
    outline = Color(0xFFE2E8F0),
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
