package com.palmtechnologies.palmcareai.ui.documents

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.DocumentItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DocumentsViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _documents = MutableStateFlow<List<DocumentItem>>(emptyList())
    val documents: StateFlow<List<DocumentItem>> = _documents

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadDocuments() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                api.getDocuments().body()?.documents?.let { _documents.value = it }
            } catch (e: Exception) {
                Log.w("DocumentsVM", "loadDocuments: ${e.message}")
            }
            _isLoading.value = false
        }
    }
}
