package com.palmtechnologies.palmcareai.ui.visits

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.palmtechnologies.palmcareai.data.models.Visit
import com.palmtechnologies.palmcareai.navigation.NavRoutes
import com.palmtechnologies.palmcareai.ui.theme.*

@Composable
fun VisitsScreen(navController: NavController, viewModel: VisitsViewModel = hiltViewModel()) {
    val visits by viewModel.visits.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadVisits() }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Text(
            "Assessments",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(20.dp)
        )

        if (isLoading && visits.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Teal500)
            }
        } else if (visits.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No assessments yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(visits) { visit ->
                    VisitRow(visit) { navController.navigate(NavRoutes.visitDetail(visit.id)) }
                }
            }
        }
    }
}

@Composable
private fun VisitRow(visit: Visit, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(visit.clientName ?: "Unknown", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (visit.hasTranscript) Chip("Transcript", SuccessGreen)
                    if (visit.hasBillables) Chip("Billables", Teal500)
                    if (visit.hasContract) Chip("Contract", Teal400)
                }
            }
            val statusColor = when (visit.status) {
                "completed" -> SuccessGreen
                "processing" -> WarningAmber
                "failed" -> ErrorRed
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            }
            Box(
                modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(statusColor.copy(alpha = 0.15f)).padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(visit.status?.replaceFirstChar { it.uppercase() } ?: "Pending", style = MaterialTheme.typography.labelSmall, color = statusColor)
            }
        }
    }
}

@Composable
private fun Chip(label: String, color: androidx.compose.ui.graphics.Color) {
    Box(
        modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(color.copy(alpha = 0.1f)).padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = color)
    }
}
