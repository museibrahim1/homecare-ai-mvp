package com.palmtechnologies.palmcareai.ui.settings

import android.content.Context
import android.webkit.URLUtil
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.local.TokenManager
import com.palmtechnologies.palmcareai.data.models.SubscriptionInfo
import com.palmtechnologies.palmcareai.data.models.UsageStats
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val api: PalmCareApi,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _subscription = MutableStateFlow<SubscriptionInfo?>(null)
    val subscription: StateFlow<SubscriptionInfo?> = _subscription

    private val _usage = MutableStateFlow<UsageStats?>(null)
    val usage: StateFlow<UsageStats?> = _usage

    private val _isDarkMode = MutableStateFlow(true)
    val isDarkMode: StateFlow<Boolean> = _isDarkMode

    private val _notificationsEnabled = MutableStateFlow(true)
    val notificationsEnabled: StateFlow<Boolean> = _notificationsEnabled

    private val _backgroundRecording = MutableStateFlow(false)
    val backgroundRecording: StateFlow<Boolean> = _backgroundRecording

    private val _biometricEnabled = MutableStateFlow(false)
    val biometricEnabled: StateFlow<Boolean> = _biometricEnabled

    init {
        viewModelScope.launch {
            _isDarkMode.value = tokenManager.darkModeFlow.first()
            _notificationsEnabled.value = tokenManager.notificationsEnabledFlow.first()
            _backgroundRecording.value = tokenManager.backgroundRecordingFlow.first()
            _biometricEnabled.value = tokenManager.biometricEnabledFlow.first()
        }
    }

    fun loadData() {
        viewModelScope.launch {
            launch {
                try { api.getSubscription().body()?.let { _subscription.value = it } } catch (_: Exception) {}
            }
            launch {
                try { api.getUsage().body()?.let { _usage.value = it } } catch (_: Exception) {}
            }
        }
    }

    fun toggleDarkMode() {
        viewModelScope.launch {
            val new = !_isDarkMode.value
            _isDarkMode.value = new
            tokenManager.setDarkMode(new)
        }
    }

    fun toggleNotifications() {
        viewModelScope.launch {
            val new = !_notificationsEnabled.value
            _notificationsEnabled.value = new
            tokenManager.setNotificationsEnabled(new)
        }
    }

    fun toggleBackgroundRecording() {
        viewModelScope.launch {
            val new = !_backgroundRecording.value
            _backgroundRecording.value = new
            tokenManager.setBackgroundRecording(new)
        }
    }

    fun enableBiometric(activity: FragmentActivity) {
        val biometricManager = BiometricManager.from(activity)
        if (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK) != BiometricManager.BIOMETRIC_SUCCESS) {
            return
        }

        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                viewModelScope.launch {
                    _biometricEnabled.value = true
                    tokenManager.setBiometricEnabled(true)
                }
            }
        })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Enable Biometric Login")
            .setSubtitle("Verify your identity to enable biometric login")
            .setNegativeBtnText("Cancel")
            .build()

        prompt.authenticate(promptInfo)
    }

    private fun BiometricPrompt.PromptInfo.Builder.setNegativeBtnText(text: String): BiometricPrompt.PromptInfo.Builder {
        return setNegativeButtonText(text)
    }

    fun disableBiometric() {
        viewModelScope.launch {
            _biometricEnabled.value = false
            tokenManager.setBiometricEnabled(false)
        }
    }

    fun updateProfile(name: String, phone: String) {
        viewModelScope.launch {
            try {
                api.updateProfile(mapOf("owner_name" to name, "phone" to phone.ifBlank { null }))
            } catch (_: Exception) {}
        }
    }

    fun changePassword(currentPassword: String, newPassword: String) {
        viewModelScope.launch {
            try {
                api.changePassword(mapOf("current_password" to currentPassword, "new_password" to newPassword))
            } catch (_: Exception) {}
        }
    }

    fun clearCache(context: Context) {
        try {
            context.cacheDir.deleteRecursively()
            android.webkit.CookieManager.getInstance().removeAllCookies(null)
        } catch (_: Exception) {}
    }
}
