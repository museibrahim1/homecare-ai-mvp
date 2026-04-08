package com.palmtechnologies.palmcareai.ui.record

import android.app.Application
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import javax.inject.Inject

@HiltViewModel
class RecordViewModel @Inject constructor(
    application: Application,
    private val api: PalmCareApi
) : AndroidViewModel(application) {

    private val _clients = MutableStateFlow<List<Client>>(emptyList())
    val clients: StateFlow<List<Client>> = _clients

    private val _selectedClient = MutableStateFlow<Client?>(null)
    val selectedClient: StateFlow<Client?> = _selectedClient

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording

    private val _recordingSeconds = MutableStateFlow(0)
    val recordingSeconds: StateFlow<Int> = _recordingSeconds

    private val _liveTranscript = MutableStateFlow("")
    val liveTranscript: StateFlow<String> = _liveTranscript

    private val _isUploading = MutableStateFlow(false)
    val isUploading: StateFlow<Boolean> = _isUploading

    private val _uploadResult = MutableStateFlow<UploadResponse?>(null)
    val uploadResult: StateFlow<UploadResponse?> = _uploadResult

    private val _pipelineStatus = MutableStateFlow<PipelineStatus?>(null)
    val pipelineStatus: StateFlow<PipelineStatus?> = _pipelineStatus

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private var audioRecord: AudioRecord? = null
    private var recordingFile: File? = null
    private var isRecordingAudio = false

    private val sampleRate = 16000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT

    fun loadClients() {
        viewModelScope.launch {
            try {
                api.getClients().body()?.let { _clients.value = it }
            } catch (_: Exception) {}
        }
    }

    fun selectClient(client: Client) {
        _selectedClient.value = client
    }

    fun startRecording() {
        val client = _selectedClient.value ?: return
        _error.value = null
        _pipelineStatus.value = null
        _uploadResult.value = null
        _recordingSeconds.value = 0
        _liveTranscript.value = ""

        viewModelScope.launch {
            try {
                val visitResp = api.createVisit(VisitCreate(clientId = client.id))
                if (!visitResp.isSuccessful) {
                    _error.value = "Could not create visit"
                    return@launch
                }
                val visit = visitResp.body()!!
                _uploadResult.value = UploadResponse(visitId = visit.id)

                val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
                audioRecord = AudioRecord(MediaRecorder.AudioSource.MIC, sampleRate, channelConfig, audioFormat, bufferSize)

                val dir = File(getApplication<Application>().cacheDir, "recordings")
                dir.mkdirs()
                recordingFile = File(dir, "recording_${System.currentTimeMillis()}.wav")

                audioRecord?.startRecording()
                isRecordingAudio = true
                _isRecording.value = true

                launch(Dispatchers.IO) { writeAudioToFile(bufferSize) }
                launch { tickTimer() }
            } catch (e: Exception) {
                _error.value = "Recording failed: ${e.message}"
                _isRecording.value = false
            }
        }
    }

    fun stopRecording() {
        isRecordingAudio = false
        _isRecording.value = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        recordingFile?.let { file ->
            writeWavHeader(file)
            uploadRecording(file)
        }
    }

    private suspend fun writeAudioToFile(bufferSize: Int) {
        val buffer = ByteArray(bufferSize)
        val fos = FileOutputStream(recordingFile!!)
        fos.write(ByteArray(44)) // placeholder for WAV header

        while (isRecordingAudio) {
            val read = audioRecord?.read(buffer, 0, bufferSize) ?: 0
            if (read > 0) fos.write(buffer, 0, read)
        }
        fos.close()
    }

    private fun writeWavHeader(file: File) {
        val dataSize = file.length() - 44
        val totalSize = dataSize + 36
        val header = ByteArray(44)
        val byteRate = (sampleRate * 1 * 16 / 8).toLong()

        header[0] = 'R'.code.toByte(); header[1] = 'I'.code.toByte(); header[2] = 'F'.code.toByte(); header[3] = 'F'.code.toByte()
        writeInt(header, 4, totalSize.toInt())
        header[8] = 'W'.code.toByte(); header[9] = 'A'.code.toByte(); header[10] = 'V'.code.toByte(); header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte(); header[13] = 'm'.code.toByte(); header[14] = 't'.code.toByte(); header[15] = ' '.code.toByte()
        writeInt(header, 16, 16)
        writeShort(header, 20, 1)
        writeShort(header, 22, 1)
        writeInt(header, 24, sampleRate)
        writeInt(header, 28, byteRate.toInt())
        writeShort(header, 32, 2)
        writeShort(header, 34, 16)
        header[36] = 'd'.code.toByte(); header[37] = 'a'.code.toByte(); header[38] = 't'.code.toByte(); header[39] = 'a'.code.toByte()
        writeInt(header, 40, dataSize.toInt())

        val raf = RandomAccessFile(file, "rw")
        raf.seek(0)
        raf.write(header)
        raf.close()
    }

    private fun writeInt(data: ByteArray, offset: Int, value: Int) {
        data[offset] = (value and 0xFF).toByte()
        data[offset + 1] = ((value shr 8) and 0xFF).toByte()
        data[offset + 2] = ((value shr 16) and 0xFF).toByte()
        data[offset + 3] = ((value shr 24) and 0xFF).toByte()
    }

    private fun writeShort(data: ByteArray, offset: Int, value: Int) {
        data[offset] = (value and 0xFF).toByte()
        data[offset + 1] = ((value shr 8) and 0xFF).toByte()
    }

    private fun uploadRecording(file: File) {
        viewModelScope.launch {
            _isUploading.value = true
            try {
                val visitId = _uploadResult.value?.visitId ?: return@launch
                val filePart = MultipartBody.Part.createFormData(
                    "file", file.name,
                    file.asRequestBody("audio/wav".toMediaTypeOrNull())
                )
                val vidBody = visitId.toRequestBody("text/plain".toMediaTypeOrNull())
                val autoBody = "true".toRequestBody("text/plain".toMediaTypeOrNull())

                val response = api.uploadAudio(filePart, vidBody, autoBody)
                if (response.isSuccessful) {
                    _uploadResult.value = response.body()?.copy(visitId = visitId) ?: _uploadResult.value
                    pollPipeline(visitId)
                } else {
                    _error.value = "Upload failed"
                }
            } catch (e: Exception) {
                _error.value = "Upload error: ${e.message}"
            }
            _isUploading.value = false
        }
    }

    private suspend fun pollPipeline(visitId: String) {
        withContext(Dispatchers.IO) {
            repeat(60) {
                try {
                    val resp = api.getPipelineStatus(visitId)
                    if (resp.isSuccessful) {
                        val body = resp.body()
                        _pipelineStatus.value = body
                        if (body?.pipelineCompleteForUi() == true || body?.status == "failed") return@withContext
                    }
                } catch (_: Exception) {}
                delay(3000)
            }
        }
    }

    private suspend fun tickTimer() {
        while (_isRecording.value) {
            delay(1000)
            _recordingSeconds.value += 1
        }
    }
}
