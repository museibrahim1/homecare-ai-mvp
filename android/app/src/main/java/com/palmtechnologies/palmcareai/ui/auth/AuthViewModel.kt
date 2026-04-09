package com.palmtechnologies.palmcareai.ui.auth

import android.util.Log
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
            Log.d(TAG, "init: saved token present=${!token.isNullOrBlank()}")
            if (!token.isNullOrBlank()) {
                _isLoggedIn.value = true
                fetchCurrentUser()
            }
        }
        viewModelScope.launch {
            tokenManager.tokenFlow.collect { token ->
                if (token.isNullOrBlank() && _isLoggedIn.value) {
                    Log.w(TAG, "Token cleared externally (expired/401), forcing logout")
                    _isLoggedIn.value = false
                    _isAdmin.value = false
                    _user.value = null
                }
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val request = LoginRequest(email.trim(), password)
                Log.d(TAG, "login: trying /auth/login for $email")
                var response = api.login(request)
                Log.d(TAG, "login: /auth/login code=${response.code()}")

                if (!response.isSuccessful) {
                    val errBody = response.errorBody()?.string()
                    Log.d(TAG, "login: /auth/login failed: $errBody, trying /auth/business/login")
                    response = api.businessLogin(request)
                    Log.d(TAG, "login: /auth/business/login code=${response.code()}")
                }

                if (response.isSuccessful) {
                    val auth = response.body()
                    Log.d(TAG, "login: success, token length=${auth?.accessToken?.length}")
                    if (auth != null && auth.accessToken.isNotBlank()) {
                        tokenManager.saveToken(auth.accessToken)
                        _isLoggedIn.value = true
                        fetchCurrentUser()
                    } else {
                        _error.value = "Login succeeded but no token received"
                        Log.w(TAG, "login: empty token in response body")
                    }
                } else {
                    val errBody = response.errorBody()?.string()
                    Log.w(TAG, "login: both endpoints failed: $errBody")
                    _error.value = "Invalid email or password"
                }
            } catch (e: Exception) {
                Log.e(TAG, "login: exception", e)
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
                Log.d(TAG, "register: attempting for $email")
                val response = api.register(request)
                Log.d(TAG, "register: code=${response.code()}")
                if (response.isSuccessful) {
                    val auth = response.body()
                    if (auth != null && auth.accessToken.isNotBlank()) {
                        tokenManager.saveToken(auth.accessToken)
                        _isLoggedIn.value = true
                        fetchCurrentUser()
                    } else {
                        _error.value = "Registration succeeded but no token received"
                    }
                } else {
                    val errBody = response.errorBody()?.string()
                    Log.w(TAG, "register: failed: $errBody")
                    _error.value = "Registration failed. Email may already be in use."
                }
            } catch (e: Exception) {
                Log.e(TAG, "register: exception", e)
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
                Log.e(TAG, "forgotPassword: exception", e)
                _error.value = "Connection error. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun fetchCurrentUser() {
        try {
            val resp = api.getCurrentUser()
            Log.d(TAG, "fetchCurrentUser: code=${resp.code()}")
            if (resp.isSuccessful) {
                val u = resp.body()!!
                _user.value = u
                _isAdmin.value = u.isAdmin
                tokenManager.saveUserId(u.id)
                Log.d(TAG, "fetchCurrentUser: user=${u.fullName}, admin=${u.isAdmin}")
            } else {
                Log.w(TAG, "fetchCurrentUser: failed ${resp.code()} ${resp.errorBody()?.string()?.take(200)}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "fetchCurrentUser: exception", e)
        }
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

    companion object {
        private const val TAG = "AuthVM"
    }
}
