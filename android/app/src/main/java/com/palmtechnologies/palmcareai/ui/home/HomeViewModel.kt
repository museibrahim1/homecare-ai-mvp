package com.palmtechnologies.palmcareai.ui.home

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

    fun refresh() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                launch {
                    api.getClients().body()?.let { _clientCount.value = it.size }
                }
                launch {
                    api.getVisits().body()?.let {
                        _visitCount.value = it.size
                        _recentVisits.value = it.sortedByDescending { v -> v.createdAt }
                    }
                }
                launch {
                    api.getUsage().body()?.let { _usage.value = it }
                }
                launch {
                    api.getCurrentUser().body()?.let { _userName.value = it.fullName?.split(" ")?.firstOrNull() }
                }
            } catch (_: Exception) {}
            _isLoading.value = false
        }
    }
}
