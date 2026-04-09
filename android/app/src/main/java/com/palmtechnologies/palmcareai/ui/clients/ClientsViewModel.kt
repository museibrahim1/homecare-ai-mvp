package com.palmtechnologies.palmcareai.ui.clients

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.Client
import com.palmtechnologies.palmcareai.data.models.ClientCreate
import com.palmtechnologies.palmcareai.data.models.Visit
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

    private val _clientVisits = MutableStateFlow<List<Visit>>(emptyList())
    val clientVisits: StateFlow<List<Visit>> = _clientVisits

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
            var client = _clients.value.find { it.id == id }
            if (client == null) {
                loadClients()
                client = _clients.value.find { it.id == id }
            }
            _selectedClient.value = client

            try {
                api.getVisits().body()?.let { list ->
                    _clientVisits.value = list.items
                        .filter { it.clientId == id }
                        .sortedByDescending { it.createdAt }
                }
            } catch (_: Exception) {}
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

    fun updateClient(id: String, body: Map<String, Any?>, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = api.updateClient(id, body)
                if (response.isSuccessful) {
                    _selectedClient.value = response.body()
                    loadClients()
                    onSuccess()
                } else {
                    _error.value = "Failed to update client"
                }
            } catch (e: Exception) {
                _error.value = "Connection error"
            }
            _isLoading.value = false
        }
    }

    fun clearError() { _error.value = null }
}
