package com.palmtechnologies.palmcareai.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.BillingPlan
import com.palmtechnologies.palmcareai.data.models.SubscriptionInfo
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SubscriptionViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _plans = MutableStateFlow<List<BillingPlan>>(emptyList())
    val plans: StateFlow<List<BillingPlan>> = _plans

    private val _subscription = MutableStateFlow<SubscriptionInfo?>(null)
    val subscription: StateFlow<SubscriptionInfo?> = _subscription

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                launch { api.getPlans().body()?.let { _plans.value = it } }
                launch { api.getSubscription().body()?.let { _subscription.value = it } }
            } catch (_: Exception) {}
            _isLoading.value = false
        }
    }

    fun checkout(planId: String, onUrl: (String) -> Unit) {
        viewModelScope.launch {
            try {
                api.checkout(mapOf("plan_id" to planId)).body()?.url?.let { onUrl(it) }
            } catch (_: Exception) {}
        }
    }
}
