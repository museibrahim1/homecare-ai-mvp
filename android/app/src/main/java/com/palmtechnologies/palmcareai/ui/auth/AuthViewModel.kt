package com.palmtechnologies.palmcareai.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.local.TokenManager
import com.palmtechnologies.palmcareai.data.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: PalmCareApi,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _isAdmin = MutableStateFlow(false)
    val isAdmin: StateFlow<Boolean> = _isAdmin.asStateFlow()

    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    init {
        viewModelScope.launch {
            val token = tokenManager.getToken()
            if (!token.isNullOrBlank()) {
                _isLoggedIn.value = true
                fetchCurrentUser()
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val request = LoginRequest(email.trim(), password)
                var response = api.login(request)
                if (!response.isSuccessful) {
                    response = api.businessLogin(request)
                }
                if (response.isSuccessful) {
                    val auth = response.body()!!
                    tokenManager.saveToken(auth.accessToken)
                    _isLoggedIn.value = true
                    fetchCurrentUser()
                } else {
                    _error.value = "Invalid email or password"
                }
            } catch (e: Exception) {
                _error.value = "Connection error. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun register(fullName: String, email: String, password: String, agencyName: String, state: String, phone: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val request = RegisterRequest(
                    email = email.trim(),
                    password = password,
                    fullName = fullName.trim(),
                    agencyName = agencyName.trim(),
                    state = state,
                    phone = phone
                )
                val response = api.register(request)
                if (response.isSuccessful) {
                    val auth = response.body()!!
                    tokenManager.saveToken(auth.accessToken)
                    _isLoggedIn.value = true
                    fetchCurrentUser()
                } else {
                    _error.value = "Registration failed. Email may already be in use."
                }
            } catch (e: Exception) {
                _error.value = "Connection error. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun forgotPassword(email: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val response = api.forgotPassword(ForgotPasswordRequest(email.trim()))
                if (response.isSuccessful) {
                    _successMessage.value = "Password reset email sent. Check your inbox."
                } else {
                    _error.value = "Could not send reset email."
                }
            } catch (e: Exception) {
                _error.value = "Connection error. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun fetchCurrentUser() {
        try {
            val response = api.getCurrentUser()
            if (response.isSuccessful) {
                val u = response.body()!!
                _user.value = u
                _isAdmin.value = u.isAdmin
                tokenManager.saveUserId(u.id)
            }
        } catch (_: Exception) {}
    }

    fun logout() {
        viewModelScope.launch {
            tokenManager.clear()
            _isLoggedIn.value = false
            _isAdmin.value = false
            _user.value = null
        }
    }

    fun clearError() { _error.value = null }
    fun clearSuccess() { _successMessage.value = null }
}
