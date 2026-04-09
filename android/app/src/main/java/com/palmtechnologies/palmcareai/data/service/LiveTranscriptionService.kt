package com.palmtechnologies.palmcareai.data.service

import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.RandomAccessFile

data class TranscriptSegment(
    val speaker: String,
    val text: String,
    val startMs: Long? = null
)

class LiveTranscriptionService(private val api: PalmCareApi) {

    private val _segments = MutableStateFlow<List<TranscriptSegment>>(emptyList())
    val segments: StateFlow<List<TranscriptSegment>> = _segments

    private val _fullTranscript = MutableStateFlow("")
    val fullTranscript: StateFlow<String> = _fullTranscript

    private val _isTranscribing = MutableStateFlow(false)
    val isTranscribing: StateFlow<Boolean> = _isTranscribing

    private var chunkJob: Job? = null
    private var lastByteOffset: Long = 0
    private val chunkIntervalMs = 5000L
    private val minChunkBytes = 64 * 1024L
    private val maxChunkBytes = 5 * 1024 * 1024L

    private val medicalKeywords = setOf(
        "blood pressure", "medication", "insulin", "diabetes", "oxygen",
        "heart rate", "temperature", "pain", "wound", "bandage",
        "prescription", "dosage", "allergies", "mobility", "cognitive",
        "therapy", "assessment", "diagnosis", "treatment", "vitals",
        "pulse", "respiration", "edema", "catheter", "incontinence",
        "fall risk", "ambulation", "ADL", "ROM", "PT", "OT", "RN"
    )

    fun isMedicalKeyword(word: String): Boolean {
        val lower = word.lowercase()
        return medicalKeywords.any { lower.contains(it) }
    }

    fun startTranscribing(recordingFile: File, scope: CoroutineScope) {
        _segments.value = emptyList()
        _fullTranscript.value = ""
        _isTranscribing.value = true
        lastByteOffset = 44

        chunkJob = scope.launch(Dispatchers.IO) {
            while (isActive && _isTranscribing.value) {
                delay(chunkIntervalMs)
                sendChunk(recordingFile)
            }
        }
    }

    fun stopTranscribing() {
        _isTranscribing.value = false
        chunkJob?.cancel()
        chunkJob = null
    }

    private suspend fun sendChunk(file: File) {
        try {
            val fileLength = file.length()
            val available = fileLength - lastByteOffset
            if (available < minChunkBytes) return

            val readSize = available.coerceAtMost(maxChunkBytes)
            val startOffset = if (available > maxChunkBytes) fileLength - maxChunkBytes else lastByteOffset

            val raf = RandomAccessFile(file, "r")
            raf.seek(startOffset)
            val buffer = ByteArray(readSize.toInt())
            raf.readFully(buffer)
            raf.close()

            lastByteOffset = startOffset + readSize

            val wavChunk = wrapInWavHeader(buffer)
            val requestBody = wavChunk.toRequestBody("audio/wav".toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", "chunk.wav", requestBody)

            val response = api.liveTranscribe(part, language = "en", diarize = true)
            if (response.isSuccessful) {
                val text = response.body()?.displayText ?: return
                if (text.isNotBlank()) {
                    buildSegments(text)
                }
            }
        } catch (_: Exception) { }
    }

    private fun buildSegments(newText: String) {
        val current = _fullTranscript.value
        val updated = if (current.isBlank()) newText else "$current $newText"
        _fullTranscript.value = updated

        val existing = _segments.value.toMutableList()
        val lastSpeaker = existing.lastOrNull()?.speaker ?: "Speaker 1"
        if (existing.isNotEmpty()) {
            val last = existing.last()
            existing[existing.size - 1] = last.copy(text = last.text + " " + newText)
        } else {
            existing.add(TranscriptSegment(speaker = lastSpeaker, text = newText))
        }
        _segments.value = existing
    }

    private fun wrapInWavHeader(pcmData: ByteArray): ByteArray {
        val sampleRate = 16000
        val bitsPerSample = 16
        val channels = 1
        val byteRate = sampleRate * channels * bitsPerSample / 8
        val blockAlign = channels * bitsPerSample / 8
        val dataSize = pcmData.size
        val totalSize = 36 + dataSize

        val header = ByteArray(44)
        header[0] = 'R'.code.toByte(); header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte(); header[3] = 'F'.code.toByte()
        writeIntLE(header, 4, totalSize)
        header[8] = 'W'.code.toByte(); header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte(); header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte(); header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte(); header[15] = ' '.code.toByte()
        writeIntLE(header, 16, 16)
        writeShortLE(header, 20, 1)
        writeShortLE(header, 22, channels)
        writeIntLE(header, 24, sampleRate)
        writeIntLE(header, 28, byteRate)
        writeShortLE(header, 32, blockAlign)
        writeShortLE(header, 34, bitsPerSample)
        header[36] = 'd'.code.toByte(); header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte(); header[39] = 'a'.code.toByte()
        writeIntLE(header, 40, dataSize)

        return header + pcmData
    }

    private fun writeIntLE(data: ByteArray, offset: Int, value: Int) {
        data[offset] = (value and 0xFF).toByte()
        data[offset + 1] = ((value shr 8) and 0xFF).toByte()
        data[offset + 2] = ((value shr 16) and 0xFF).toByte()
        data[offset + 3] = ((value shr 24) and 0xFF).toByte()
    }

    private fun writeShortLE(data: ByteArray, offset: Int, value: Int) {
        data[offset] = (value and 0xFF).toByte()
        data[offset + 1] = ((value shr 8) and 0xFF).toByte()
    }
}
