package com.palmtechnologies.palmcareai.ui.agent

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.AgentChatRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AgentViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun send(text: String) {
        _messages.value = _messages.value + ChatMessage(text = text, isUser = true)
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = api.agentChat(AgentChatRequest(message = text))
                if (response.isSuccessful) {
                    val reply = response.body()?.text ?: "I could not process that request."
                    _messages.value = _messages.value + ChatMessage(text = reply, isUser = false)
                } else {
                    _messages.value = _messages.value + ChatMessage(text = "Something went wrong. Please try again.", isUser = false)
                }
            } catch (e: Exception) {
                _messages.value = _messages.value + ChatMessage(text = "Connection error. Please check your internet.", isUser = false)
            }
            _isLoading.value = false
        }
    }
}
