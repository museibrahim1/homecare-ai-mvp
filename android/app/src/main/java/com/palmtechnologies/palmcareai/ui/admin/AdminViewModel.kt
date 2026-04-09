package com.palmtechnologies.palmcareai.ui.admin

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "AdminVM"

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

    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message

    fun loadWeeklyPlan(weekOffset: Int = 0) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                api.getWeeklyPlan(weekOffset).body()?.let { _weeklyPlan.value = it }
            } catch (e: Exception) {
                Log.w(TAG, "loadWeeklyPlan: ${e.message}")
            }
            _isLoading.value = false
        }
    }

    fun markCalled(leadId: String) {
        viewModelScope.launch {
            try {
                api.markCalled(leadId)
                loadWeeklyPlan()
            } catch (e: Exception) {
                Log.w(TAG, "markCalled: ${e.message}")
            }
        }
    }

    fun approveDraft(draftId: String) {
        viewModelScope.launch {
            try {
                api.generateDraft(mapOf("draft_id" to draftId))
                api.approveDraft(draftId)
                loadWeeklyPlan()
            } catch (e: Exception) {
                Log.w(TAG, "approveDraft: ${e.message}")
            }
        }
    }

    fun batchSendEmails() {
        viewModelScope.launch {
            _isSending.value = true
            try {
                val resp = api.batchSend(mapOf("send_all" to true))
                _message.value = resp.body()?.message ?: "Emails sent"
                loadWeeklyPlan()
            } catch (e: Exception) {
                _message.value = "Failed to send: ${e.message}"
            }
            _isSending.value = false
        }
    }

    fun loadSalesLeads() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                api.getSalesLeads().body()?.let { _salesLeads.value = it }
            } catch (e: Exception) {
                Log.w(TAG, "loadSalesLeads: ${e.message}")
            }
            _isLoading.value = false
        }
    }

    fun loadInvestors() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                api.getInvestors().body()?.let { _investors.value = it }
            } catch (e: Exception) {
                Log.w(TAG, "loadInvestors: ${e.message}")
            }
            _isLoading.value = false
        }
    }

    fun clearMessage() { _message.value = null }
}
