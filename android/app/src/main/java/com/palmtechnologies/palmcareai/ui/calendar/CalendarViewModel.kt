package com.palmtechnologies.palmcareai.ui.calendar

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

@HiltViewModel
class CalendarViewModel @Inject constructor(private val api: PalmCareApi) : ViewModel() {
    private val _events = MutableStateFlow<List<CalendarEvent>>(emptyList())
    val events: StateFlow<List<CalendarEvent>> = _events

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadEvents() {
        viewModelScope.launch {
            _isLoading.value = true
            try { api.getCalendarEvents().body()?.let { _events.value = it } } catch (_: Exception) {}
            _isLoading.value = false
        }
    }

    fun createEvent(title: String, date: String) {
        viewModelScope.launch {
            try {
                api.createCalendarEvent(CalendarEventCreate(title = title, start = "${date}T09:00:00"))
                loadEvents()
            } catch (_: Exception) {}
        }
    }

    fun deleteEvent(id: String) {
        viewModelScope.launch {
            try { api.deleteCalendarEvent(id); loadEvents() } catch (_: Exception) {}
        }
    }
}
