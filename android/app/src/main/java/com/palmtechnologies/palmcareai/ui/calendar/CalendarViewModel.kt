package com.palmtechnologies.palmcareai.ui.calendar

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palmtechnologies.palmcareai.data.api.PalmCareApi
import com.palmtechnologies.palmcareai.data.models.CalendarEvent
import com.palmtechnologies.palmcareai.data.models.CalendarEventCreate
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "CalendarVM"

@HiltViewModel
class CalendarViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _events = MutableStateFlow<List<CalendarEvent>>(emptyList())
    val events: StateFlow<List<CalendarEvent>> = _events

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadEvents() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                api.getCalendarEvents().body()?.let { _events.value = it.sortedBy { e -> e.start } }
            } catch (e: Exception) {
                Log.w(TAG, "loadEvents: ${e.message}")
            }
            _isLoading.value = false
        }
    }

    fun createEvent(title: String, date: String, time: String = "09:00", description: String = "") {
        viewModelScope.launch {
            try {
                val start = "${date}T${time}:00"
                api.createCalendarEvent(CalendarEventCreate(
                    title = title,
                    start = start,
                    description = description.ifBlank { null }
                ))
                loadEvents()
            } catch (e: Exception) {
                Log.w(TAG, "createEvent: ${e.message}")
            }
        }
    }

    fun deleteEvent(id: String) {
        viewModelScope.launch {
            try {
                api.deleteCalendarEvent(id)
                loadEvents()
            } catch (e: Exception) {
                Log.w(TAG, "deleteEvent: ${e.message}")
            }
        }
    }
}
