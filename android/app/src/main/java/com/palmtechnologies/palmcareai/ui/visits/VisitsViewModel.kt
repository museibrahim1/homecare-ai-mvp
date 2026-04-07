package com.palmtechnologies.palmcareai.ui.visits

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
class VisitsViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _visits = MutableStateFlow<List<Visit>>(emptyList())
    val visits: StateFlow<List<Visit>> = _visits

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _transcript = MutableStateFlow<TranscriptResponse?>(null)
    val transcript: StateFlow<TranscriptResponse?> = _transcript

    private val _billables = MutableStateFlow<List<BillableItem>>(emptyList())
    val billables: StateFlow<List<BillableItem>> = _billables

    private val _note = MutableStateFlow<String?>(null)
    val note: StateFlow<String?> = _note

    private val _contract = MutableStateFlow<String?>(null)
    val contract: StateFlow<String?> = _contract

    private val _selectedVisit = MutableStateFlow<Visit?>(null)
    val selectedVisit: StateFlow<Visit?> = _selectedVisit

    fun loadVisits() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                api.getVisits().body()?.let { _visits.value = it.sortedByDescending { v -> v.createdAt } }
            } catch (_: Exception) {}
            _isLoading.value = false
        }
    }

    fun loadVisitDetail(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                api.getVisit(id).body()?.let { _selectedVisit.value = it }
                launch { api.getTranscript(id).body()?.let { _transcript.value = it } }
                launch { api.getBillables(id).body()?.let { _billables.value = it.allItems } }
                launch { api.getNote(id).body()?.let { _note.value = it.displayNote } }
                launch { api.getContract(id).body()?.let { _contract.value = it.displayContract } }
            } catch (_: Exception) {}
            _isLoading.value = false
        }
    }

    fun updateBillableStatus(visitId: String, itemId: String, status: String) {
        viewModelScope.launch {
            try {
                api.updateBillable(visitId, itemId, mapOf("status" to status))
                loadVisitDetail(visitId)
            } catch (_: Exception) {}
        }
    }
}
