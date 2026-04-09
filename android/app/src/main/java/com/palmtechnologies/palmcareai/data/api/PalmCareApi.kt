package com.palmtechnologies.palmcareai.data.api

import com.palmtechnologies.palmcareai.data.models.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface PalmCareApi {

    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/business/login")
    suspend fun businessLogin(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/business/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @GET("auth/me")
    suspend fun getCurrentUser(): Response<User>

    @PUT("auth/business/profile")
    suspend fun updateProfile(@Body body: Map<String, @JvmSuppressWildcards Any?>): Response<User>

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: Map<String, String>): Response<MessageResponse>

    // Clients
    @GET("clients")
    suspend fun getClients(): Response<List<Client>>

    @POST("clients")
    suspend fun createClient(@Body client: ClientCreate): Response<Client>

    @PUT("clients/{id}")
    suspend fun updateClient(@Path("id") id: String, @Body body: Map<String, @JvmSuppressWildcards Any?>): Response<Client>

    // Visits
    @GET("visits")
    suspend fun getVisits(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 100
    ): Response<VisitListResponse>

    @POST("visits")
    suspend fun createVisit(@Body visit: VisitCreate): Response<Visit>

    @GET("visits/{id}")
    suspend fun getVisit(@Path("id") id: String): Response<Visit>

    @GET("visits/usage")
    suspend fun getUsage(): Response<UsageStats>

    // Upload
    @Multipart
    @POST("uploads/audio")
    suspend fun uploadAudio(
        @Part file: MultipartBody.Part,
        @Part("visit_id") visitId: RequestBody,
        @Part("auto_process") autoProcess: RequestBody
    ): Response<UploadResponse>

    // Visit detail
    @GET("visits/{id}/transcript")
    suspend fun getTranscript(@Path("id") id: String): Response<TranscriptResponse>

    @GET("visits/{id}/billables")
    suspend fun getBillables(@Path("id") id: String): Response<BillablesResponse>

    @PUT("visits/{visitId}/billables/{itemId}")
    suspend fun updateBillable(
        @Path("visitId") visitId: String,
        @Path("itemId") itemId: String,
        @Body body: Map<String, String>
    ): Response<BillableItem>

    @GET("visits/{id}/note")
    suspend fun getNote(@Path("id") id: String): Response<NoteResponse>

    @GET("visits/{id}/contract")
    suspend fun getContract(@Path("id") id: String): Response<ContractResponse>

    // Pipeline
    @GET("pipeline/visits/{id}/status")
    suspend fun getPipelineStatus(@Path("id") id: String): Response<PipelineStatus>

    @POST("pipeline/visits/{id}/{step}")
    suspend fun runPipelineStep(@Path("id") id: String, @Path("step") step: String): Response<MessageResponse>

    @POST("visits/{id}/restart")
    suspend fun restartAssessment(@Path("id") id: String): Response<MessageResponse>

    // Live transcription
    @Multipart
    @POST("live/transcribe")
    suspend fun liveTranscribe(
        @Part file: MultipartBody.Part,
        @Query("language") language: String = "en",
        @Query("diarize") diarize: Boolean = true
    ): Response<LiveTranscriptResponse>

    // Exports (download files)
    @GET("exports/visits/{id}/note.pdf")
    @Streaming
    suspend fun exportNotePdf(@Path("id") id: String): Response<ResponseBody>

    @GET("exports/visits/{id}/contract.pdf")
    @Streaming
    suspend fun exportContractPdf(@Path("id") id: String): Response<ResponseBody>

    @GET("exports/visits/{id}/timesheet.csv")
    @Streaming
    suspend fun exportTimesheetCsv(@Path("id") id: String): Response<ResponseBody>

    @GET("exports/visits/{id}/contract.docx")
    @Streaming
    suspend fun exportContractDocx(@Path("id") id: String): Response<ResponseBody>

    // Calendar
    @GET("calendar/status")
    suspend fun getCalendarStatus(): Response<CalendarStatusResponse>

    @GET("calendar/events")
    suspend fun getCalendarEvents(
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null
    ): Response<List<CalendarEvent>>

    @POST("calendar/events")
    suspend fun createCalendarEvent(@Body event: CalendarEventCreate): Response<CalendarEvent>

    @DELETE("calendar/events/{id}")
    suspend fun deleteCalendarEvent(@Path("id") id: String): Response<MessageResponse>

    @POST("calendar/connect")
    suspend fun connectCalendar(@Body body: Map<String, String>): Response<MessageResponse>

    @POST("calendar/disconnect")
    suspend fun disconnectCalendar(): Response<MessageResponse>

    // Documents
    @GET("documents")
    suspend fun getDocuments(): Response<DocumentsResponse>

    // Contract templates
    @GET("contract-templates/")
    suspend fun getContractTemplates(): Response<List<ContractTemplate>>

    // Billing
    @GET("billing/subscription")
    suspend fun getSubscription(): Response<SubscriptionInfo>

    @GET("billing/plans")
    suspend fun getPlans(): Response<List<BillingPlan>>

    @POST("billing/checkout")
    suspend fun checkout(@Body body: Map<String, String>): Response<CheckoutResponse>

    // Palm Agent
    @POST("platform/agent/chat")
    suspend fun agentChat(@Body request: AgentChatRequest): Response<AgentChatResponse>

    @POST("platform/agent/tts")
    @Streaming
    suspend fun agentTts(@Body body: Map<String, String>): Response<ResponseBody>

    // Admin: Outreach
    @GET("platform/outreach/weekly-plan")
    suspend fun getWeeklyPlan(@Query("week_offset") weekOffset: Int = 0): Response<OutreachWeeklyPlan>

    @POST("platform/outreach/generate-draft")
    suspend fun generateDraft(@Body body: Map<String, String>): Response<OutreachDraft>

    @POST("platform/outreach/approve-draft/{id}")
    suspend fun approveDraft(@Path("id") id: String): Response<MessageResponse>

    @POST("platform/outreach/mark-called/{id}")
    suspend fun markCalled(@Path("id") id: String): Response<MessageResponse>

    @POST("platform/outreach/batch-send")
    suspend fun batchSend(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<MessageResponse>

    // Admin: Sales Leads
    @GET("platform/sales/leads")
    suspend fun getSalesLeads(
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 100
    ): Response<List<SalesLead>>

    // Admin: Investors
    @GET("platform/investors/")
    suspend fun getInvestors(
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 100
    ): Response<List<InvestorRecord>>

    // Notes/Tasks
    @GET("notes/tasks")
    suspend fun getTasks(): Response<List<TaskItem>>

    @POST("notes/tasks")
    suspend fun createTask(@Body task: TaskCreate): Response<TaskItem>

    @PUT("notes/tasks/{id}")
    suspend fun updateTask(@Path("id") id: String, @Body body: Map<String, @JvmSuppressWildcards Any?>): Response<TaskItem>

    @PUT("notes/tasks/{id}/complete")
    suspend fun completeTask(@Path("id") id: String): Response<TaskItem>

    @DELETE("notes/tasks/{id}")
    suspend fun deleteTask(@Path("id") id: String): Response<MessageResponse>
}
