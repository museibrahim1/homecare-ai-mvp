package com.palmtechnologies.palmcareai.ui.visits

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.palmtechnologies.palmcareai.data.models.*
import com.palmtechnologies.palmcareai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisitDetailScreen(visitId: String, navController: NavController, viewModel: VisitsViewModel = hiltViewModel()) {
    val visit by viewModel.selectedVisit.collectAsState()
    val transcript by viewModel.transcript.collectAsState()
    val billables by viewModel.billables.collectAsState()
    val noteResponse by viewModel.noteResponse.collectAsState()
    val note by viewModel.note.collectAsState()
    val contractResponse by viewModel.contractResponse.collectAsState()
    val contract by viewModel.contract.collectAsState()
    val exportMessage by viewModel.exportMessage.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    var showExportMenu by remember { mutableStateOf(false) }
    var showRestartDialog by remember { mutableStateOf(false) }

    LaunchedEffect(visitId) { viewModel.loadVisitDetail(visitId) }

    if (exportMessage != null) {
        LaunchedEffect(exportMessage) {
            kotlinx.coroutines.delay(2000)
            viewModel.clearExportMessage()
        }
    }

    if (showRestartDialog) {
        AlertDialog(
            onDismissRequest = { showRestartDialog = false },
            title = { Text("Restart Assessment") },
            text = { Text("This will reprocess the assessment from scratch. All current results will be replaced. Continue?") },
            confirmButton = {
                Button(
                    onClick = {
                        showRestartDialog = false
                        viewModel.restartAssessment(visitId)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ErrorRed)
                ) { Text("Restart") }
            },
            dismissButton = {
                TextButton(onClick = { showRestartDialog = false }) { Text("Cancel") }
            }
        )
    }

    val tabs = listOf("Overview", "Transcript", "Billables", "Notes", "Contract")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(visit?.clientName ?: "Assessment") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { showExportMenu = true }) {
                            Icon(Icons.Filled.MoreVert, contentDescription = "Menu")
                        }
                        DropdownMenu(expanded = showExportMenu, onDismissRequest = { showExportMenu = false }) {
                            DropdownMenuItem(
                                text = { Text("Export Notes (PDF)") },
                                onClick = { showExportMenu = false; viewModel.exportNotePdf(visitId) },
                                leadingIcon = { Icon(Icons.Filled.PictureAsPdf, contentDescription = null, tint = Teal500) }
                            )
                            DropdownMenuItem(
                                text = { Text("Export Contract (PDF)") },
                                onClick = { showExportMenu = false; viewModel.exportContractPdf(visitId) },
                                leadingIcon = { Icon(Icons.Filled.PictureAsPdf, contentDescription = null, tint = Teal500) }
                            )
                            DropdownMenuItem(
                                text = { Text("Export Contract (DOCX)") },
                                onClick = { showExportMenu = false; viewModel.exportContractDocx(visitId) },
                                leadingIcon = { Icon(Icons.Filled.Description, contentDescription = null, tint = Teal500) }
                            )
                            DropdownMenuItem(
                                text = { Text("Export Timesheet (CSV)") },
                                onClick = { showExportMenu = false; viewModel.exportTimesheetCsv(visitId) },
                                leadingIcon = { Icon(Icons.Filled.TableChart, contentDescription = null, tint = Teal500) }
                            )
                            HorizontalDivider()
                            DropdownMenuItem(
                                text = { Text("Restart Assessment", color = ErrorRed) },
                                onClick = { showExportMenu = false; showRestartDialog = true },
                                leadingIcon = { Icon(Icons.Filled.Refresh, contentDescription = null, tint = ErrorRed) }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        snackbarHost = {
            if (exportMessage != null) {
                Snackbar(modifier = Modifier.padding(16.dp)) { Text(exportMessage!!) }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.background,
                contentColor = Teal500,
                edgePadding = 16.dp
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(selected = selectedTab == index, onClick = { selectedTab = index }, text = { Text(title) })
                }
            }

            when (selectedTab) {
                0 -> OverviewTab(visit)
                1 -> TranscriptTab(transcript)
                2 -> BillablesTab(billables, visitId, viewModel)
                3 -> NotesTab(note, noteResponse)
                4 -> ContractTab(contract, contractResponse)
            }
        }
    }
}

@Composable
private fun OverviewTab(visit: Visit?) {
    if (visit == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Teal500)
        }
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Client", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(visit.clientName, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
                    if (!visit.createdAt.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Created: ${visit.createdAt.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (!visit.adminNotes.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(visit.adminNotes, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    if (!visit.status.isNullOrBlank()) {
                        Box(
                            modifier = Modifier.clip(RoundedCornerShape(6.dp))
                                .background(statusColor(visit.status).copy(alpha = 0.15f))
                                .padding(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Text(visit.status.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = statusColor(visit.status))
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Pipeline Status", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(12.dp))
                    PIPELINE_DISPLAY_STEPS.forEach { (step, label) ->
                        val completed = when (step) {
                            "transcription" -> visit.hasTranscript
                            "billing" -> visit.hasBillables
                            "note" -> visit.hasNote
                            "contract" -> visit.hasContract
                            else -> false
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                if (completed) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                                contentDescription = null,
                                tint = if (completed) SuccessGreen else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickStatCard(Modifier.weight(1f), "Transcript", visit.hasTranscript)
                QuickStatCard(Modifier.weight(1f), "Billables", visit.hasBillables)
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickStatCard(Modifier.weight(1f), "Notes", visit.hasNote)
                QuickStatCard(Modifier.weight(1f), "Contract", visit.hasContract)
            }
        }
    }
}

@Composable
private fun QuickStatCard(modifier: Modifier, label: String, available: Boolean) {
    Card(modifier = modifier, shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (available) Icons.Filled.CheckCircle else Icons.Filled.Cancel,
                contentDescription = null,
                tint = if (available) SuccessGreen else Dark400,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

private fun statusColor(status: String?): androidx.compose.ui.graphics.Color = when (status) {
    "pending_review", "approved", "exported", "completed" -> SuccessGreen
    "processing", "in_progress" -> WarningAmber
    "failed" -> ErrorRed
    else -> Dark400
}

@Composable
private fun TranscriptTab(transcript: TranscriptResponse?) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (transcript != null) {
            val wordCount = transcript.wordCount ?: transcript.transcript?.split(" ")?.size ?: 0
            val duration = transcript.duration
            if (wordCount > 0 || duration != null) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        if (wordCount > 0) Text("$wordCount words", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (duration != null) Text("${(duration / 60).toInt()}m ${(duration % 60).toInt()}s", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }

        if (transcript?.speakers != null && transcript.speakers.isNotEmpty()) {
            items(transcript.speakers) { seg ->
                Card(shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Row(modifier = Modifier.padding(12.dp)) {
                        Box(
                            modifier = Modifier.size(32.dp).clip(CircleShape).background(speakerColor(seg.speaker).copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                (seg.speaker ?: "?").take(1).uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = speakerColor(seg.speaker),
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(seg.speaker ?: "Speaker", style = MaterialTheme.typography.labelSmall, color = speakerColor(seg.speaker), fontWeight = FontWeight.SemiBold)
                                if (seg.startMs != null || seg.start != null) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    val timeMs = seg.startMs ?: ((seg.start ?: 0.0) * 1000).toLong()
                                    Text(formatMs(timeMs), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(seg.text ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }
        } else if (!transcript?.transcript.isNullOrBlank()) {
            item { Text(transcript!!.transcript!!, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface) }
        } else {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                    Text("No transcript available", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

private fun speakerColor(speaker: String?): androidx.compose.ui.graphics.Color {
    val colors = listOf(Teal500, WarningAmber, SuccessGreen, ErrorRed, Teal300, Teal700)
    val idx = speaker?.filter { it.isDigit() }?.toIntOrNull() ?: 0
    return colors[idx % colors.size]
}

private fun formatMs(ms: Long): String {
    val totalSec = ms / 1000
    val m = totalSec / 60
    val s = totalSec % 60
    return "%d:%02d".format(m, s)
}

@Composable
private fun BillablesTab(billables: List<BillableItem>, visitId: String, viewModel: VisitsViewModel) {
    val hasPending = billables.any { it.status == "pending" && it.id != null }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${billables.size} items", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.weight(1f))
                if (hasPending) {
                    TextButton(onClick = { viewModel.approveAllBillables(visitId) }) {
                        Text("Approve All", color = SuccessGreen, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        if (billables.isEmpty()) {
            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No billable items", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        }
        items(billables) { item ->
            val borderColor = when {
                item.approved == true || item.status == "approved" -> SuccessGreen
                item.denied == true || item.status == "denied" -> ErrorRed
                else -> MaterialTheme.colorScheme.outline
            }
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, borderColor.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(item.code ?: "N/A", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
                                if (!item.category.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Box(
                                        modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(Teal500.copy(alpha = 0.1f)).padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(item.category, style = MaterialTheme.typography.labelSmall, color = Teal500)
                                    }
                                }
                            }
                            Text(item.description ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("$${item.total ?: 0.0}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                    }

                    val isPending = item.status == "pending" && item.approved != true && item.denied != true
                    if (isPending && item.id != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = { viewModel.updateBillableStatus(visitId, item.id, "approved") },
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SuccessGreen),
                                modifier = Modifier.weight(1f)
                            ) { Text("Approve") }
                            OutlinedButton(
                                onClick = { viewModel.updateBillableStatus(visitId, item.id, "denied") },
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            ) { Text("Deny", color = ErrorRed) }
                        }
                    } else if (item.approved == true || item.status == "approved") {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Approved", style = MaterialTheme.typography.labelSmall, color = SuccessGreen, fontWeight = FontWeight.Bold)
                    } else if (item.denied == true || item.status == "denied") {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Denied", style = MaterialTheme.typography.labelSmall, color = ErrorRed, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun NotesTab(note: String?, noteResponse: NoteResponse?) {
    val structured = noteResponse?.structuredData

    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (structured != null) {
            item { Text("Clinical Notes (SOAP)", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold) }

            if (!structured.mood.isNullOrBlank()) {
                item { SoapSection("Mood / Affect", structured.mood) }
            }
            if (!structured.subjective.isNullOrBlank()) {
                item { SoapSection("Subjective (S)", structured.subjective) }
            }
            if (!structured.objective.isNullOrBlank()) {
                item { SoapSection("Objective (O)", structured.objective) }
            }
            if (!structured.assessment.isNullOrBlank()) {
                item { SoapSection("Assessment (A)", structured.assessment) }
            }
            if (!structured.plan.isNullOrBlank()) {
                item { SoapSection("Plan (P)", structured.plan) }
            }
            if (!structured.tasks.isNullOrEmpty()) {
                item {
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Tasks", style = MaterialTheme.typography.titleSmall, color = Teal500, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(8.dp))
                            structured.tasks.forEach { task ->
                                Row(modifier = Modifier.padding(vertical = 2.dp)) {
                                    Text("•", color = Teal500)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(task, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                    }
                }
            }
            if (!structured.safety.isNullOrBlank()) {
                item { SoapSection("Safety Concerns", structured.safety) }
            }
            if (!structured.nextVisitPlan.isNullOrBlank()) {
                item { SoapSection("Next Visit Plan", structured.nextVisitPlan) }
            }
            if (!structured.narrativeSummary.isNullOrBlank()) {
                item {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                    Text("Narrative Summary", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(structured.narrativeSummary, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        } else if (!note.isNullOrBlank()) {
            item { Text(note, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface) }
        } else {
            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No notes available", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        }
    }
}

@Composable
private fun SoapSection(title: String, content: String) {
    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall, color = Teal500, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(6.dp))
            Text(content, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun ContractTab(contract: String?, contractResponse: ContractResponse?) {
    var showFullContract by remember { mutableStateOf(false) }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (contractResponse != null && contract != null) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(contractResponse.title ?: "Service Agreement", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    if (!contractResponse.status.isNullOrBlank()) {
                        Box(
                            modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(SuccessGreen.copy(alpha = 0.15f)).padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(contractResponse.status.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = SuccessGreen)
                        }
                    }
                }
            }

            if (!contractResponse.style.isNullOrBlank()) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Palette, contentDescription = null, tint = Teal500, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Style: ${contractResponse.style.replaceFirstChar { it.uppercase() }}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            if (contractResponse.hourlyRate != null || contractResponse.weeklyHours != null) {
                item {
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            if (contractResponse.hourlyRate != null) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("$${contractResponse.hourlyRate}/hr", style = MaterialTheme.typography.titleLarge, color = Teal500, fontWeight = FontWeight.Bold)
                                    Text("Hourly Rate", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            if (contractResponse.weeklyHours != null) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("${contractResponse.weeklyHours}h", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                                    Text("Weekly Hours", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            contractResponse.weeklyTotal?.let { total ->
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("$${total}", style = MaterialTheme.typography.titleLarge, color = SuccessGreen, fontWeight = FontWeight.Bold)
                                    Text("Weekly Total", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }

            if (!contractResponse.services.isNullOrEmpty()) {
                item {
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Services", style = MaterialTheme.typography.titleSmall, color = Teal500, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(8.dp))
                            contractResponse.services.forEach { svc ->
                                Row(modifier = Modifier.padding(vertical = 2.dp)) {
                                    Icon(Icons.Filled.Check, contentDescription = null, tint = Teal500, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(svc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                    }
                }
            }

            if (!contractResponse.schedule.isNullOrBlank()) {
                item {
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Schedule", style = MaterialTheme.typography.titleSmall, color = Teal500, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(contractResponse.schedule, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }

            item {
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Full Agreement", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            TextButton(onClick = { showFullContract = !showFullContract }) {
                                Text(if (showFullContract) "Collapse" else "View", color = Teal500)
                            }
                        }
                        if (showFullContract) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(contract, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }
        } else if (!contract.isNullOrBlank()) {
            item { Text(contract, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface) }
        } else {
            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No contract available", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        }
    }
}
