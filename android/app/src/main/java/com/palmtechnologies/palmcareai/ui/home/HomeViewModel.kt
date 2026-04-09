package com.palmtechnologies.palmcareai.ui.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.UsageStats
import com.palmtechnologies.palmcareai.data.models.Visit
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _clientCount = MutableStateFlow(0)
    val clientCount: StateFlow<Int> = _clientCount

    private val _visitCount = MutableStateFlow(0)
    val visitCount: StateFlow<Int> = _visitCount

    private val _usage = MutableStateFlow<UsageStats?>(null)
    val usage: StateFlow<UsageStats?> = _usage

    private val _recentVisits = MutableStateFlow<List<Visit>>(emptyList())
    val recentVisits: StateFlow<List<Visit>> = _recentVisits

    private val _userName = MutableStateFlow<String?>(null)
    val userName: StateFlow<String?> = _userName

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun refresh() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            launch {
                try {
                    val resp = api.getClients()
                    Log.d(TAG, "getClients: code=${resp.code()}")
                    if (resp.isSuccessful) {
                        _clientCount.value = resp.body()?.size ?: 0
                    } else {
                        val err = resp.errorBody()?.string()?.take(200)
                        Log.w(TAG, "getClients failed: ${resp.code()} $err")
                        _error.value = "Clients: ${resp.code()} $err"
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "getClients error", e)
                    _error.value = "Clients: ${e.message}"
                }
            }
            launch {
                try {
                    val resp = api.getVisits()
                    Log.d(TAG, "getVisits: code=${resp.code()}")
                    if (resp.isSuccessful) {
                        val list = resp.body()
                        _visitCount.value = list?.total ?: 0
                        _recentVisits.value = list?.items?.sortedByDescending { v -> v.createdAt } ?: emptyList()
                    } else {
                        val err = resp.errorBody()?.string()?.take(200)
                        Log.w(TAG, "getVisits failed: ${resp.code()} $err")
                        if (_error.value == null) _error.value = "Visits: ${resp.code()} $err"
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "getVisits error", e)
                    if (_error.value == null) _error.value = "Visits: ${e.message}"
                }
            }
            launch {
                try {
                    val resp = api.getUsage()
                    Log.d(TAG, "getUsage: code=${resp.code()}")
                    if (resp.isSuccessful) {
                        _usage.value = resp.body()
                    } else {
                        Log.w(TAG, "getUsage failed: ${resp.code()} ${resp.errorBody()?.string()?.take(200)}")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "getUsage error", e)
                }
            }
            launch {
                try {
                    val resp = api.getCurrentUser()
                    Log.d(TAG, "getCurrentUser: code=${resp.code()}")
                    if (resp.isSuccessful) {
                        _userName.value = resp.body()?.fullName?.split(" ")?.firstOrNull()
                    } else {
                        Log.w(TAG, "getCurrentUser failed: ${resp.code()} ${resp.errorBody()?.string()?.take(200)}")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "getCurrentUser error", e)
                }
            }
            _isLoading.value = false
        }
    }

    companion object {
        private const val TAG = "HomeVM"
    }
}
