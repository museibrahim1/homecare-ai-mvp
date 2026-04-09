package com.palmtechnologies.palmcareai.ui.visits

import android.app.Application
import android.content.Intent
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.ResponseBody
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

@HiltViewModel
class VisitsViewModel @Inject constructor(
    application: Application,
    private val api: PalmCareApi
) : AndroidViewModel(application) {

    private val _visits = MutableStateFlow<List<Visit>>(emptyList())
    val visits: StateFlow<List<Visit>> = _visits

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _transcript = MutableStateFlow<TranscriptResponse?>(null)
    val transcript: StateFlow<TranscriptResponse?> = _transcript

    private val _billables = MutableStateFlow<List<BillableItem>>(emptyList())
    val billables: StateFlow<List<BillableItem>> = _billables

    private val _noteResponse = MutableStateFlow<NoteResponse?>(null)
    val noteResponse: StateFlow<NoteResponse?> = _noteResponse

    private val _note = MutableStateFlow<String?>(null)
    val note: StateFlow<String?> = _note

    private val _contractResponse = MutableStateFlow<ContractResponse?>(null)
    val contractResponse: StateFlow<ContractResponse?> = _contractResponse

    private val _contract = MutableStateFlow<String?>(null)
    val contract: StateFlow<String?> = _contract

    private val _selectedVisit = MutableStateFlow<Visit?>(null)
    val selectedVisit: StateFlow<Visit?> = _selectedVisit

    private val _exportMessage = MutableStateFlow<String?>(null)
    val exportMessage: StateFlow<String?> = _exportMessage

    fun loadVisits() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val resp = api.getVisits()
                Log.d(TAG, "getVisits: code=${resp.code()}")
                if (resp.isSuccessful) {
                    val list = resp.body()
                    _visits.value = list?.items?.sortedByDescending { v -> v.createdAt } ?: emptyList()
                    Log.d(TAG, "getVisits: loaded ${_visits.value.size} visits")
                } else {
                    Log.w(TAG, "getVisits failed: ${resp.code()} ${resp.errorBody()?.string()?.take(200)}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "getVisits error", e)
            }
            _isLoading.value = false
        }
    }

    fun loadVisitDetail(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _transcript.value = null
            _billables.value = emptyList()
            _note.value = null
            _noteResponse.value = null
            _contract.value = null
            _contractResponse.value = null

            try {
                val visitResp = api.getVisit(id)
                Log.d(TAG, "getVisit($id): code=${visitResp.code()}")
                if (visitResp.isSuccessful) {
                    _selectedVisit.value = visitResp.body()
                } else {
                    Log.w(TAG, "getVisit failed: ${visitResp.code()}")
                }
                launch {
                    try {
                        val r = api.getTranscript(id)
                        Log.d(TAG, "getTranscript: code=${r.code()}")
                        if (r.isSuccessful) _transcript.value = r.body()
                    } catch (e: Exception) { Log.e(TAG, "getTranscript error", e) }
                }
                launch {
                    try {
                        val r = api.getBillables(id)
                        Log.d(TAG, "getBillables: code=${r.code()}")
                        if (r.isSuccessful) _billables.value = r.body()?.allItems ?: emptyList()
                    } catch (e: Exception) { Log.e(TAG, "getBillables error", e) }
                }
                launch {
                    try {
                        val r = api.getNote(id)
                        Log.d(TAG, "getNote: code=${r.code()}")
                        if (r.isSuccessful) {
                            r.body()?.let {
                                _noteResponse.value = it
                                _note.value = it.displayNote
                            }
                        }
                    } catch (e: Exception) { Log.e(TAG, "getNote error", e) }
                }
                launch {
                    try {
                        val r = api.getContract(id)
                        Log.d(TAG, "getContract: code=${r.code()}")
                        if (r.isSuccessful) {
                            r.body()?.let {
                                _contractResponse.value = it
                                _contract.value = it.displayContract
                            }
                        }
                    } catch (e: Exception) { Log.e(TAG, "getContract error", e) }
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadVisitDetail error", e)
            }
            _isLoading.value = false
        }
    }

    fun updateBillableStatus(visitId: String, itemId: String, status: String) {
        viewModelScope.launch {
            try {
                api.updateBillable(visitId, itemId, mapOf("status" to status))
                try { api.getBillables(visitId).body()?.let { _billables.value = it.allItems } } catch (_: Exception) {}
            } catch (_: Exception) {}
        }
    }

    fun approveAllBillables(visitId: String) {
        viewModelScope.launch {
            _billables.value.filter { it.status == "pending" && it.id != null }.forEach { item ->
                try { api.updateBillable(visitId, item.id!!, mapOf("status" to "approved")) } catch (_: Exception) {}
            }
            try { api.getBillables(visitId).body()?.let { _billables.value = it.allItems } } catch (_: Exception) {}
        }
    }

    fun restartAssessment(visitId: String) {
        viewModelScope.launch {
            try {
                val resp = api.restartAssessment(visitId)
                if (resp.isSuccessful) {
                    _transcript.value = null
                    _billables.value = emptyList()
                    _note.value = null
                    _noteResponse.value = null
                    _contract.value = null
                    _contractResponse.value = null
                    loadVisitDetail(visitId)
                }
            } catch (_: Exception) {}
        }
    }

    fun exportNotePdf(visitId: String) {
        exportFile(visitId, "note.pdf") { api.exportNotePdf(it) }
    }

    fun exportContractPdf(visitId: String) {
        exportFile(visitId, "contract.pdf") { api.exportContractPdf(it) }
    }

    fun exportContractDocx(visitId: String) {
        exportFile(visitId, "contract.docx") { api.exportContractDocx(it) }
    }

    fun exportTimesheetCsv(visitId: String) {
        exportFile(visitId, "timesheet.csv") { api.exportTimesheetCsv(it) }
    }

    private fun exportFile(visitId: String, filename: String, call: suspend (String) -> retrofit2.Response<ResponseBody>) {
        viewModelScope.launch {
            try {
                val resp = call(visitId)
                if (resp.isSuccessful) {
                    val body = resp.body() ?: return@launch
                    val dir = File(getApplication<Application>().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "PalmCare")
                    dir.mkdirs()
                    val file = File(dir, "${visitId}_$filename")
                    FileOutputStream(file).use { out ->
                        body.byteStream().copyTo(out)
                    }

                    val uri = FileProvider.getUriForFile(
                        getApplication(),
                        "${getApplication<Application>().packageName}.fileprovider",
                        file
                    )
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(uri, resp.headers()["Content-Type"] ?: "application/octet-stream")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    getApplication<Application>().startActivity(intent)
                    _exportMessage.value = "Exported $filename"
                } else {
                    _exportMessage.value = "Export failed"
                }
            } catch (e: Exception) {
                _exportMessage.value = "Export error: ${e.message}"
            }
        }
    }

    fun clearExportMessage() {
        _exportMessage.value = null
    }

    companion object {
        private const val TAG = "VisitsVM"
    }
}
