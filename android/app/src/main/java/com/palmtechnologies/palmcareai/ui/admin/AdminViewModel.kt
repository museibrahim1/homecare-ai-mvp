package com.palmtechnologies.palmcareai.ui.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _weeklyPlan = MutableStateFlow<OutreachWeeklyPlan?>(null)
    val weeklyPlan: StateFlow<OutreachWeeklyPlan?> = _weeklyPlan

    private val _salesLeads = MutableStateFlow<List<SalesLead>>(emptyList())
    val salesLeads: StateFlow<List<SalesLead>> = _salesLeads

    private val _investors = MutableStateFlow<List<InvestorRecord>>(emptyList())
    val investors: StateFlow<List<InvestorRecord>> = _investors

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadWeeklyPlan() {
        viewModelScope.launch {
            _isLoading.value = true
            try { api.getWeeklyPlan().body()?.let { _weeklyPlan.value = it } } catch (_: Exception) {}
            _isLoading.value = false
        }
    }

    fun markCalled(leadId: String) {
        viewModelScope.launch {
            try { api.markCalled(leadId); loadWeeklyPlan() } catch (_: Exception) {}
        }
    }

    fun approveDraft(draftId: String) {
        viewModelScope.launch {
            try { api.approveDraft(draftId); loadWeeklyPlan() } catch (_: Exception) {}
        }
    }

    fun loadSalesLeads() {
        viewModelScope.launch {
            _isLoading.value = true
            try { api.getSalesLeads().body()?.let { _salesLeads.value = it } } catch (_: Exception) {}
            _isLoading.value = false
        }
    }

    fun loadInvestors() {
        viewModelScope.launch {
            _isLoading.value = true
            try { api.getInvestors().body()?.let { _investors.value = it } } catch (_: Exception) {}
            _isLoading.value = false
        }
    }
}
