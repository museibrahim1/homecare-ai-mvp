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
import com.palmtechnologies.palmcareai.ui.theme.*

@Composable
fun SalesLeadsScreen(viewModel: AdminViewModel = hiltViewModel()) {
    val leads by viewModel.salesLeads.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var search by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadSalesLeads() }

    val filtered = leads.filter {
        search.isBlank() || (it.providerName ?: "").contains(search, ignoreCase = true)
                || (it.contactName ?: "").contains(search, ignoreCase = true)
                || (it.state ?: "").contains(search, ignoreCase = true)
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Text("Sales Leads", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(20.dp))

        OutlinedTextField(
            value = search, onValueChange = { search = it },
            placeholder = { Text("Search leads...") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            shape = RoundedCornerShape(12.dp), singleLine = true
        )

        Spacer(modifier = Modifier.height(8.dp))

        if (isLoading && leads.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Teal500) }
        } else {
            LazyColumn(contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filtered) { lead ->
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(lead.providerName ?: "Unknown Agency", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                if (!lead.contactName.isNullOrBlank()) Text(lead.contactName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    if (!lead.state.isNullOrBlank()) Text(lead.state, style = MaterialTheme.typography.labelSmall, color = Teal500)
                                    Text("Emails: ${lead.emailSendCount}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("Calls: ${lead.callCount}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
