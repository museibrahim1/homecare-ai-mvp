package com.palmtechnologies.palmcareai.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    @SerialName("full_name") val fullName: String,
    @SerialName("agency_name") val agencyName: String,
    val state: String = "",
    val phone: String = ""
)

@Serializable
data class AuthResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("token_type") val tokenType: String = "bearer"
)

@Serializable
data class User(
    val id: String,
    val email: String,
    @SerialName("full_name") val fullName: String? = null,
    /** API uses `company_name` on the User model */
    @SerialName("company_name") val agencyName: String? = null,
    val role: String? = null,
    @SerialName("is_admin") val isAdminField: Boolean? = null,
    val state: String? = null,
    val phone: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("google_calendar_connected") val googleCalendarConnected: Boolean = false
) {
    val isAdmin: Boolean
        get() = isAdminField == true || role == "admin" || role == "admin_team"
}

@Serializable
data class Client(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val state: String? = null,
    val city: String? = null,
    @SerialName("zip_code") val zipCode: String? = null,
    @SerialName("date_of_birth") val dateOfBirth: String? = null,
    val gender: String? = null,
    @SerialName("insurance_provider") val insuranceProvider: String? = null,
    @SerialName("insurance_id") val insuranceId: String? = null,
    @SerialName("emergency_contact_name") val emergencyContactName: String? = null,
    @SerialName("emergency_contact_phone") val emergencyContactPhone: String? = null,
    @SerialName("emergency_contact_relationship") val emergencyContactRelationship: String? = null,
    @SerialName("medical_conditions") val medicalConditions: String? = null,
    val medications: String? = null,
    val allergies: String? = null,
    val notes: String? = null,
    val status: String? = "active",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
) {
    val displayName: String get() = fullName ?: name ?: "Unknown"
}

@Serializable
data class ClientCreate(
    @SerialName("full_name") val fullName: String,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val state: String? = null,
    val city: String? = null,
    @SerialName("zip_code") val zipCode: String? = null,
    @SerialName("date_of_birth") val dateOfBirth: String? = null,
    val gender: String? = null,
    @SerialName("insurance_provider") val insuranceProvider: String? = null,
    @SerialName("insurance_id") val insuranceId: String? = null,
    @SerialName("emergency_contact_name") val emergencyContactName: String? = null,
    @SerialName("emergency_contact_phone") val emergencyContactPhone: String? = null,
    @SerialName("emergency_contact_relationship") val emergencyContactRelationship: String? = null,
    @SerialName("medical_conditions") val medicalConditions: String? = null,
    val medications: String? = null,
    val allergies: String? = null,
    val notes: String? = null
)

@Serializable
data class VisitListResponse(
    val items: List<Visit> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    @SerialName("page_size") val pageSize: Int = 20
)

@Serializable
data class Visit(
    val id: String,
    @SerialName("client_id") val clientId: String,
    @SerialName("caregiver_id") val caregiverId: String? = null,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    val client: VisitClientEmbed? = null,
    val caregiver: JsonElement? = null,
    @SerialName("pipeline_state") val pipelineState: JsonObject? = null,
    @SerialName("admin_notes") val adminNotes: String? = null
) {
    @Serializable
    data class VisitClientEmbed(
        val id: String? = null,
        @SerialName("full_name") val fullName: String? = null
    )

    val clientName: String get() = client?.fullName ?: "Unknown"
    val hasTranscript: Boolean get() = pipelineStepCompleted(pipelineState, "transcription")
    val hasBillables: Boolean get() = pipelineStepCompleted(pipelineState, "billing")
    val hasNote: Boolean get() = pipelineStepCompleted(pipelineState, "note")
    val hasContract: Boolean get() = pipelineStepCompleted(pipelineState, "contract")
}

private fun pipelineStepCompleted(state: JsonObject?, step: String): Boolean {
    val el = state?.get(step) ?: return false
    val obj = el as? JsonObject ?: return false
    val st = obj["status"]?.jsonPrimitive?.content ?: return false
    return st == "completed"
}

@Serializable
data class VisitCreate(
    @SerialName("client_id") val clientId: String
)

@Serializable
data class UploadResponse(
    @SerialName("visit_id") val visitId: String? = null,
    val message: String? = null,
    val status: String? = null
)

@Serializable
data class TranscriptResponse(
    val transcript: String? = null,
    val speakers: List<SpeakerSegment>? = null
)

@Serializable
data class SpeakerSegment(
    val speaker: String? = null,
    val text: String? = null,
    val start: Double? = null,
    val end: Double? = null
)

@Serializable
data class BillableItem(
    val id: String? = null,
    val code: String? = null,
    val description: String? = null,
    val units: Double? = null,
    val rate: Double? = null,
    val total: Double? = null,
    val status: String? = "pending",
    val category: String? = null
)

@Serializable
data class BillablesResponse(
    val billables: List<BillableItem>? = null,
    val items: List<BillableItem>? = null
) {
    val allItems: List<BillableItem> get() = billables ?: items ?: emptyList()
}

@Serializable
data class NoteResponse(
    val note: String? = null,
    val content: String? = null,
    @SerialName("soap_note") val soapNote: String? = null
) {
    val displayNote: String get() = note ?: soapNote ?: content ?: ""
}

@Serializable
data class ContractResponse(
    val contract: String? = null,
    val content: String? = null,
    @SerialName("html_content") val htmlContent: String? = null
) {
    val displayContract: String get() = contract ?: htmlContent ?: content ?: ""
}

@Serializable
data class PipelineStatus(
    @SerialName("visit_id") val visitId: String? = null,
    /** Visit row status: scheduled, in_progress, pending_review, approved, exported */
    val status: String? = null,
    @SerialName("pipeline_state") val pipelineState: JsonObject? = null
)

private val PIPELINE_STEP_ORDER = listOf(
    "transcription", "diarization", "alignment", "billing", "note", "contract"
)

fun PipelineStatus.uiProgress(): Float {
    if (pipelineCompleteForUi()) return 1f
    val done = PIPELINE_STEP_ORDER.count { pipelineStepCompleted(pipelineState, it) }
    return done.coerceAtLeast(0).toFloat() / PIPELINE_STEP_ORDER.size.coerceAtLeast(1)
}

fun PipelineStatus.uiCurrentStepLabel(): String {
    if (pipelineCompleteForUi()) return "Complete"
    for (step in PIPELINE_STEP_ORDER) {
        if (!pipelineStepCompleted(pipelineState, step)) {
            return step.replaceFirstChar { it.uppercase() }
        }
    }
    return "Processing"
}

fun PipelineStatus.pipelineCompleteForUi(): Boolean =
    status in setOf("pending_review", "approved", "exported")

@Serializable
data class UsageStats(
    @SerialName("completed_assessments") val completedAssessments: Int = 0,
    @SerialName("total_assessments") val totalAssessments: Int = 0,
    @SerialName("max_allowed") val maxAllowed: Int = 0,
    @SerialName("can_create") val canCreate: Boolean = true,
    @SerialName("plan_name") val planName: String? = null,
    @SerialName("plan_tier") val planTier: String? = null,
    @SerialName("has_paid_plan") val hasPaidPlan: Boolean = false,
    @SerialName("upgrade_required") val upgradeRequired: Boolean = false
) {
    val visitsThisMonth: Int get() = totalAssessments
    val visitsLimit: Int get() = maxAllowed
    val visitsRemaining: Int get() = (maxAllowed - totalAssessments).coerceAtLeast(0)
}

@Serializable
data class CalendarEvent(
    val id: String? = null,
    val title: String,
    val description: String? = null,
    val start: String,
    val end: String? = null,
    val date: String? = null,
    @SerialName("all_day") val allDay: Boolean = false,
    val color: String? = null
)

@Serializable
data class CalendarEventCreate(
    val title: String,
    val description: String? = null,
    val start: String,
    val end: String? = null,
    @SerialName("all_day") val allDay: Boolean = false
)

@Serializable
data class DocumentItem(
    val id: String? = null,
    val name: String? = null,
    val filename: String? = null,
    val type: String? = null,
    @SerialName("visit_id") val visitId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    val url: String? = null
)

@Serializable
data class DocumentsResponse(
    val documents: List<DocumentItem>? = null
)

@Serializable
data class SubscriptionInfo(
    val plan: String? = null,
    val status: String? = null,
    @SerialName("current_period_end") val currentPeriodEnd: String? = null,
    @SerialName("cancel_at_period_end") val cancelAtPeriodEnd: Boolean = false
)

@Serializable
data class BillingPlan(
    val id: String,
    val name: String,
    val price: Double,
    val interval: String,
    val features: List<String> = emptyList()
)

@Serializable
data class CheckoutResponse(
    val url: String
)

@Serializable
data class AgentChatRequest(
    val message: String,
    val context: String? = null
)

@Serializable
data class AgentChatResponse(
    val response: String? = null,
    val message: String? = null
) {
    val text: String get() = response ?: message ?: ""
}

@Serializable
data class OutreachWeeklyPlan(
    val days: List<OutreachDay> = emptyList(),
    @SerialName("total_calls") val totalCalls: Int = 0,
    @SerialName("total_emails") val totalEmails: Int = 0,
    @SerialName("unsent_agency_emails") val unsentAgencyEmails: Int = 0,
    @SerialName("unsent_investor_emails") val unsentInvestorEmails: Int = 0,
    @SerialName("total_called") val totalCalled: Int = 0,
    @SerialName("total_with_phone") val totalWithPhone: Int = 0
)

@Serializable
data class OutreachDay(
    val date: String,
    val label: String? = null,
    val calls: List<OutreachLead> = emptyList(),
    val emails: List<OutreachDraft> = emptyList()
)

@Serializable
data class OutreachLead(
    val id: String? = null,
    val name: String? = null,
    val phone: String? = null,
    val state: String? = null,
    val email: String? = null,
    @SerialName("agency_name") val agencyName: String? = null,
    @SerialName("called") val called: Boolean = false
)

@Serializable
data class OutreachDraft(
    val id: String? = null,
    val subject: String? = null,
    val body: String? = null,
    @SerialName("to_email") val toEmail: String? = null,
    @SerialName("to_name") val toName: String? = null,
    val status: String? = null
)

@Serializable
data class SalesLead(
    val id: String,
    @SerialName("provider_name") val providerName: String? = null,
    @SerialName("contact_name") val contactName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val state: String? = null,
    val city: String? = null,
    val status: String? = null,
    @SerialName("assigned_to") val assignedTo: String? = null,
    @SerialName("email_send_count") val emailSendCount: Int = 0,
    @SerialName("last_email_sent_at") val lastEmailSentAt: String? = null,
    @SerialName("call_count") val callCount: Int = 0,
    @SerialName("last_called_at") val lastCalledAt: String? = null
)

@Serializable
data class InvestorRecord(
    val id: String,
    val name: String? = null,
    val firm: String? = null,
    val email: String? = null,
    val stage: String? = null,
    val focus: String? = null,
    @SerialName("email_send_count") val emailSendCount: Int = 0,
    @SerialName("email_open_count") val emailOpenCount: Int = 0,
    @SerialName("last_email_sent_at") val lastEmailSentAt: String? = null
)

@Serializable
data class LiveTranscriptResponse(
    val text: String? = null,
    val transcript: String? = null,
    @SerialName("is_final") val isFinal: Boolean = false
) {
    val displayText: String get() = text ?: transcript ?: ""
}

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class MessageResponse(val message: String? = null, val detail: String? = null)

@Serializable
data class PaginatedResponse<T : @Serializable Any>(
    val items: List<T> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pages: Int = 1
)
