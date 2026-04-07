package com.palmtechnologies.palmcareai.ui.visits

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.palmtechnologies.palmcareai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisitDetailScreen(visitId: String, navController: NavController, viewModel: VisitsViewModel = hiltViewModel()) {
    val visit by viewModel.selectedVisit.collectAsState()
    val transcript by viewModel.transcript.collectAsState()
    val billables by viewModel.billables.collectAsState()
    val note by viewModel.note.collectAsState()
    val contract by viewModel.contract.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    LaunchedEffect(visitId) { viewModel.loadVisitDetail(visitId) }

    val tabs = listOf("Overview", "Transcript", "Billables", "Notes", "Contract")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(visit?.clientName ?: "Assessment") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
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
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            when (selectedTab) {
                0 -> OverviewTab(visit)
                1 -> TranscriptTab(transcript)
                2 -> BillablesTab(billables, visitId, viewModel)
                3 -> NotesTab(note)
                4 -> ContractTab(contract)
            }
        }
    }
}

@Composable
private fun OverviewTab(visit: com.palmtechnologies.palmcareai.data.models.Visit?) {
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
                    Text(visit.clientName ?: "Unknown", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        StatusChip("Transcript", visit.hasTranscript)
                        StatusChip("Billables", visit.hasBillables)
                        StatusChip("Notes", visit.hasNote)
                        StatusChip("Contract", visit.hasContract)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusChip(label: String, available: Boolean) {
    val color = if (available) SuccessGreen else Dark400
    Box(
        modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(color.copy(alpha = 0.15f)).padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = color)
    }
}

@Composable
private fun TranscriptTab(transcript: com.palmtechnologies.palmcareai.data.models.TranscriptResponse?) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (transcript?.speakers != null && transcript.speakers.isNotEmpty()) {
            items(transcript.speakers) { seg ->
                Card(shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(seg.speaker ?: "Speaker", style = MaterialTheme.typography.labelSmall, color = Teal500, fontWeight = FontWeight.SemiBold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(seg.text ?: "", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        } else if (!transcript?.transcript.isNullOrBlank()) {
            item {
                Text(transcript!!.transcript!!, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
            }
        } else {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                    Text("No transcript available", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun BillablesTab(billables: List<com.palmtechnologies.palmcareai.data.models.BillableItem>, visitId: String, viewModel: VisitsViewModel) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (billables.isEmpty()) {
            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No billable items", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        }
        items(billables) { item ->
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.code ?: "N/A", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
                            Text(item.description ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("$${item.total ?: 0.0}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                    }
                    if (item.status == "pending" && item.id != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = { viewModel.updateBillableStatus(visitId, item.id, "approved") },
                                shape = RoundedCornerShape(8.dp)
                            ) { Text("Approve", color = SuccessGreen) }
                            OutlinedButton(
                                onClick = { viewModel.updateBillableStatus(visitId, item.id, "denied") },
                                shape = RoundedCornerShape(8.dp)
                            ) { Text("Deny", color = ErrorRed) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotesTab(note: String?) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        if (note.isNullOrBlank()) {
            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No notes available", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        } else {
            item { Text(note, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface) }
        }
    }
}

@Composable
private fun ContractTab(contract: String?) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(20.dp)) {
        if (contract.isNullOrBlank()) {
            item { Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { Text("No contract available", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        } else {
            item { Text(contract, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface) }
        }
    }
}
