package com.palmtechnologies.palmcareai.ui.clients

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.Client
import com.palmtechnologies.palmcareai.data.models.ClientCreate
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ClientsViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _clients = MutableStateFlow<List<Client>>(emptyList())
    val clients: StateFlow<List<Client>> = _clients

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _selectedClient = MutableStateFlow<Client?>(null)
    val selectedClient: StateFlow<Client?> = _selectedClient

    fun loadClients() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = api.getClients()
                if (response.isSuccessful) {
                    _clients.value = response.body() ?: emptyList()
                }
            } catch (e: Exception) {
                _error.value = "Failed to load clients"
            }
            _isLoading.value = false
        }
    }

    fun loadClient(id: String) {
        viewModelScope.launch {
            val client = _clients.value.find { it.id == id }
            if (client != null) {
                _selectedClient.value = client
            } else {
                loadClients()
                _selectedClient.value = _clients.value.find { it.id == id }
            }
        }
    }

    fun createClient(client: ClientCreate, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = api.createClient(client)
                if (response.isSuccessful) {
                    loadClients()
                    onSuccess()
                } else {
                    _error.value = "Failed to create client"
                }
            } catch (e: Exception) {
                _error.value = "Connection error"
            }
            _isLoading.value = false
        }
    }
}
