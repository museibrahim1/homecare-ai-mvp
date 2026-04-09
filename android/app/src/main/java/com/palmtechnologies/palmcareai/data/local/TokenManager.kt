package com.palmtechnologies.palmcareai.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "palmcare_prefs")

@Singleton
class TokenManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private val TOKEN_KEY = stringPreferencesKey("auth_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val BIOMETRIC_ENABLED = booleanPreferencesKey("biometric_enabled")
        private val DARK_MODE = booleanPreferencesKey("dark_mode")
        private val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
        private val BACKGROUND_RECORDING = booleanPreferencesKey("background_recording")
        private val LAST_ACTIVE_TIME = longPreferencesKey("last_active_time")
        private val ASSESSMENT_IN_PROGRESS = booleanPreferencesKey("assessment_in_progress")
    }

    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[TOKEN_KEY] }
    val darkModeFlow: Flow<Boolean> = context.dataStore.data.map { it[DARK_MODE] ?: true }
    val biometricEnabledFlow: Flow<Boolean> = context.dataStore.data.map { it[BIOMETRIC_ENABLED] ?: false }
    val notificationsEnabledFlow: Flow<Boolean> = context.dataStore.data.map { it[NOTIFICATIONS_ENABLED] ?: true }
    val backgroundRecordingFlow: Flow<Boolean> = context.dataStore.data.map { it[BACKGROUND_RECORDING] ?: false }

    suspend fun getToken(): String? = context.dataStore.data.first()[TOKEN_KEY]

    suspend fun saveToken(token: String) {
        context.dataStore.edit { it[TOKEN_KEY] = token }
    }

    suspend fun saveUserId(id: String) {
        context.dataStore.edit { it[USER_ID_KEY] = id }
    }

    suspend fun getUserId(): String? = context.dataStore.data.first()[USER_ID_KEY]

    suspend fun setBiometricEnabled(enabled: Boolean) {
        context.dataStore.edit { it[BIOMETRIC_ENABLED] = enabled }
    }

    suspend fun getBiometricEnabled(): Boolean = context.dataStore.data.first()[BIOMETRIC_ENABLED] ?: false

    suspend fun setDarkMode(enabled: Boolean) {
        context.dataStore.edit { it[DARK_MODE] = enabled }
    }

    suspend fun getDarkMode(): Boolean = context.dataStore.data.first()[DARK_MODE] ?: true

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { it[NOTIFICATIONS_ENABLED] = enabled }
    }

    suspend fun setBackgroundRecording(enabled: Boolean) {
        context.dataStore.edit { it[BACKGROUND_RECORDING] = enabled }
    }

    suspend fun getBackgroundRecording(): Boolean = context.dataStore.data.first()[BACKGROUND_RECORDING] ?: false

    suspend fun setLastActiveTime(time: Long) {
        context.dataStore.edit { it[LAST_ACTIVE_TIME] = time }
    }

    suspend fun getLastActiveTime(): Long = context.dataStore.data.first()[LAST_ACTIVE_TIME] ?: 0L

    suspend fun setAssessmentInProgress(inProgress: Boolean) {
        context.dataStore.edit { it[ASSESSMENT_IN_PROGRESS] = inProgress }
    }

    suspend fun getAssessmentInProgress(): Boolean = context.dataStore.data.first()[ASSESSMENT_IN_PROGRESS] ?: false

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
