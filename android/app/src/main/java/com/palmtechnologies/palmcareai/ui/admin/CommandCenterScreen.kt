package com.palmtechnologies.palmcareai.ui.admin

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.palmtechnologies.palmcareai.navigation.NavRoutes
import com.palmtechnologies.palmcareai.ui.home.StatCard
import com.palmtechnologies.palmcareai.ui.theme.*

@Composable
fun CommandCenterScreen(navController: NavController, viewModel: AdminViewModel = hiltViewModel()) {
    val weeklyPlan by viewModel.weeklyPlan.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var selectedDay by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) { viewModel.loadWeeklyPlan() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Command Center", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground)
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(Modifier.weight(1f), "Calls", "${weeklyPlan?.totalCalls ?: 0}", Icons.Filled.Phone, Teal500)
                StatCard(Modifier.weight(1f), "Emails", "${weeklyPlan?.totalEmails ?: 0}", Icons.Filled.Email, Teal400)
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(Modifier.weight(1f), "Unsent Agency", "${weeklyPlan?.unsentAgencyEmails ?: 0}", Icons.Filled.MarkEmailUnread, WarningAmber)
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

            val today = days.getOrNull(selectedDay)
            if (today != null) {
                if (today.calls.isNotEmpty()) {
                    item { Text("Calls (${today.calls.size})", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold) }
                    items(today.calls) { lead ->
                        Card(shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(lead.name ?: lead.agencyName ?: "Unknown", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                    Text(lead.phone ?: "No phone", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    if (!lead.state.isNullOrBlank()) Text(lead.state, style = MaterialTheme.typography.bodySmall, color = Teal500)
                                }
                                if (!lead.called) {
                                    FilledIconButton(
                                        onClick = { lead.id?.let { viewModel.markCalled(it) } },
                                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = SuccessGreen)
                                    ) { Icon(Icons.Filled.Check, contentDescription = "Mark Called") }
                                } else {
                                    Icon(Icons.Filled.CheckCircle, contentDescription = "Called", tint = SuccessGreen)
                                }
                            }
                        }
                    }
                }

                if (today.emails.isNotEmpty()) {
                    item { Text("Email Drafts (${today.emails.size})", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold) }
                    items(today.emails) { draft ->
                        Card(shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(draft.toName ?: draft.toEmail ?: "Unknown", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                Text(draft.subject ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                                if (draft.status == "draft" && draft.id != null) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Button(
                                        onClick = { viewModel.approveDraft(draft.id) },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
                                    ) { Text("Approve & Send", style = MaterialTheme.typography.labelSmall) }
                                }
                            }
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
