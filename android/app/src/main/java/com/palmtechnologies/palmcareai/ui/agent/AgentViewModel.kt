package com.palmtechnologies.palmcareai.ui.agent

import android.app.Application
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.speech.SpeechRecognizer
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.AgentChatRequest
import com.palmtechnologies.palmcareai.data.models.AgentHistoryItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class AgentViewModel @Inject constructor(
    application: Application,
    private val api: PalmCareApi
) : AndroidViewModel(application) {

    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking

    private val _ttsEnabled = MutableStateFlow(true)
    val ttsEnabled: StateFlow<Boolean> = _ttsEnabled

    private var audioTrack: AudioTrack? = null

    fun toggleTts() {
        _ttsEnabled.value = !_ttsEnabled.value
        if (!_ttsEnabled.value) stopTts()
    }

    fun clearMessages() {
        _messages.value = emptyList()
        stopTts()
    }

    fun send(text: String) {
        _messages.value = _messages.value + ChatMessage(text = text, isUser = true)
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val history = _messages.value.takeLast(20).map {
                    AgentHistoryItem(role = if (it.isUser) "user" else "assistant", content = it.text)
                }
                val response = api.agentChat(AgentChatRequest(message = text, history = history))
                if (response.isSuccessful) {
                    val body = response.body()
                    val reply = body?.text ?: "I could not process that request."
                    val files = body?.files?.map { it.filename ?: "file" } ?: emptyList()
                    _messages.value = _messages.value + ChatMessage(text = reply, isUser = false, files = files)

                    if (_ttsEnabled.value && reply.isNotBlank()) {
                        speakText(reply)
                    }
                } else {
                    _messages.value = _messages.value + ChatMessage(text = "Something went wrong. Please try again.", isUser = false)
                }
            } catch (e: Exception) {
                _messages.value = _messages.value + ChatMessage(text = "Connection error. Please check your internet.", isUser = false)
            }
            _isLoading.value = false
        }
    }

    private fun speakText(text: String) {
        viewModelScope.launch {
            _isSpeaking.value = true
            try {
                val response = withContext(Dispatchers.IO) {
                    api.agentTts(mapOf("text" to text, "voice" to "nova"))
                }
                if (response.isSuccessful) {
                    val bytes = withContext(Dispatchers.IO) {
                        response.body()?.bytes()
                    }
                    if (bytes != null && bytes.isNotEmpty()) {
                        playAudioBytes(bytes)
                    }
                }
            } catch (_: Exception) { }
            _isSpeaking.value = false
        }
    }

    private suspend fun playAudioBytes(data: ByteArray) {
        withContext(Dispatchers.IO) {
            try {
                val sampleRate = 24000
                val channelConfig = AudioFormat.CHANNEL_OUT_MONO
                val audioFormat = AudioFormat.ENCODING_PCM_16BIT
                val bufferSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, audioFormat)

                audioTrack = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setSampleRate(sampleRate)
                            .setChannelMask(channelConfig)
                            .setEncoding(audioFormat)
                            .build()
                    )
                    .setBufferSizeInBytes(bufferSize.coerceAtLeast(data.size))
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                audioTrack?.write(data, 0, data.size)
                audioTrack?.play()

                val durationMs = (data.size.toLong() * 1000) / (sampleRate * 2)
                kotlinx.coroutines.delay(durationMs + 200)

                audioTrack?.stop()
                audioTrack?.release()
                audioTrack = null
            } catch (_: Exception) {
                audioTrack?.release()
                audioTrack = null
            }
        }
    }

    fun stopTts() {
        _isSpeaking.value = false
        try {
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
        } catch (_: Exception) {}
    }

    override fun onCleared() {
        super.onCleared()
        stopTts()
    }
}
