package com.palmtechnologies.palmcareai.ui.admin

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.palmtechnologies.palmcareai.ui.home.StatCard
import com.palmtechnologies.palmcareai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommandCenterScreen(navController: NavController, viewModel: AdminViewModel = hiltViewModel()) {
    val weeklyPlan by viewModel.weeklyPlan.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSending by viewModel.isSending.collectAsState()
    val message by viewModel.message.collectAsState()
    var selectedDay by remember { mutableIntStateOf(0) }
    var selectedSegment by remember { mutableIntStateOf(0) }
    val context = LocalContext.current

    LaunchedEffect(Unit) { viewModel.loadWeeklyPlan() }

    if (message != null) {
        LaunchedEffect(message) {
            kotlinx.coroutines.delay(3000)
            viewModel.clearMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Command Center") },
                actions = {
                    if (isSending) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp).padding(end = 8.dp), color = Teal500, strokeWidth = 2.dp)
                    } else {
                        IconButton(onClick = { viewModel.batchSendEmails() }) {
                            Icon(Icons.Filled.Send, contentDescription = "Send All", tint = Teal500)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        snackbarHost = {
            if (message != null) {
                Snackbar(modifier = Modifier.padding(16.dp)) { Text(message!!) }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).background(MaterialTheme.colorScheme.background),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatCard(Modifier.weight(1f), "Calls", "${weeklyPlan?.totalCalls ?: 0}", Icons.Filled.Phone, Teal500)
                    StatCard(Modifier.weight(1f), "Emails", "${weeklyPlan?.totalEmails ?: 0}", Icons.Filled.Email, Teal400)
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatCard(Modifier.weight(1f), "Unsent", "${(weeklyPlan?.unsentAgencyEmails ?: 0) + (weeklyPlan?.unsentInvestorEmails ?: 0)}", Icons.Filled.MarkEmailUnread, WarningAmber)
                    StatCard(Modifier.weight(1f), "Called", "${weeklyPlan?.totalCalled ?: 0}/${weeklyPlan?.totalWithPhone ?: 0}", Icons.Filled.PhoneCallback, SuccessGreen)
                }
            }

            val days = weeklyPlan?.days ?: emptyList()
            if (days.isNotEmpty()) {
                item {
                    ScrollableTabRow(
                        selectedTabIndex = selectedDay.coerceIn(0, days.size - 1),
                        containerColor = MaterialTheme.colorScheme.surface,
                        contentColor = Teal500,
                        edgePadding = 0.dp
                    ) {
                        days.forEachIndexed { i, day ->
                            Tab(selected = selectedDay == i, onClick = { selectedDay = i }, text = { Text(day.label ?: day.date) })
                        }
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Agencies", "Investors", "Calls").forEachIndexed { i, label ->
                            FilterChip(
                                selected = selectedSegment == i,
                                onClick = { selectedSegment = i },
                                label = { Text(label) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Teal500.copy(alpha = 0.15f),
                                    selectedLabelColor = Teal500
                                )
                            )
                        }
                    }
                }

                val today = days.getOrNull(selectedDay)
                if (today != null) {
                    when (selectedSegment) {
                        0, 1 -> {
                            val drafts = today.emails.filter {
                                if (selectedSegment == 0) it.type != "investor" else it.type == "investor"
                            }
                            if (drafts.isEmpty()) {
                                item { EmptyState("No ${if (selectedSegment == 0) "agency" else "investor"} emails for this day") }
                            }
                            items(drafts) { draft ->
                                DraftCard(draft) { draft.id?.let { viewModel.approveDraft(it) } }
                            }
                        }
                        2 -> {
                            if (today.calls.isEmpty()) {
                                item { EmptyState("No calls scheduled for this day") }
                            }
                            items(today.calls) { lead ->
                                CallCard(lead,
                                    onCall = {
                                        lead.phone?.let { phone ->
                                            context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                                        }
                                    },
                                    onMarkCalled = { lead.id?.let { viewModel.markCalled(it) } }
                                )
                            }
                        }
                    }
                }
            }

            if (isLoading) {
                item { Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Teal500) } }
            }
        }
    }
}

@Composable
private fun DraftCard(draft: com.palmtechnologies.palmcareai.data.models.OutreachDraft, onApprove: () -> Unit) {
    Card(shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(draft.toName ?: draft.toEmail ?: "Unknown", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    if (!draft.toEmail.isNullOrBlank()) {
                        Text(draft.toEmail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (draft.status != null) {
                    val color = if (draft.status == "sent") SuccessGreen else WarningAmber
                    Text(draft.status.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = color)
                }
            }
            if (!draft.subject.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(draft.subject, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
            }
            if (draft.status == "draft" && draft.id != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = onApprove,
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                ) { Text("Approve & Send", style = MaterialTheme.typography.labelSmall) }
            }
        }
    }
}

@Composable
private fun CallCard(
    lead: com.palmtechnologies.palmcareai.data.models.OutreachLead,
    onCall: () -> Unit,
    onMarkCalled: () -> Unit
) {
    Card(shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(lead.name ?: lead.agencyName ?: "Unknown", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Text(lead.phone ?: "No phone", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (!lead.state.isNullOrBlank()) Text(lead.state, style = MaterialTheme.typography.bodySmall, color = Teal500)
            }
            if (!lead.called) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (!lead.phone.isNullOrBlank()) {
                        FilledIconButton(
                            onClick = onCall,
                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = Teal600)
                        ) { Icon(Icons.Filled.Phone, contentDescription = "Call") }
                    }
                    FilledIconButton(
                        onClick = onMarkCalled,
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = SuccessGreen)
                    ) { Icon(Icons.Filled.Check, contentDescription = "Mark Called") }
                }
            } else {
                Icon(Icons.Filled.CheckCircle, contentDescription = "Called", tint = SuccessGreen, modifier = Modifier.size(28.dp))
            }
        }
    }
}

@Composable
private fun EmptyState(text: String) {
    Card(shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
            Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
