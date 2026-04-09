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
import com.palmtechnologies.palmcareai.ui.theme.*

@Composable
fun SalesLeadsScreen(viewModel: AdminViewModel = hiltViewModel()) {
    val leads by viewModel.salesLeads.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var search by remember { mutableStateOf("") }
    val context = LocalContext.current

    LaunchedEffect(Unit) { viewModel.loadSalesLeads() }

    val filtered = leads.filter {
        search.isBlank() || (it.providerName ?: "").contains(search, ignoreCase = true)
                || (it.contactName ?: "").contains(search, ignoreCase = true)
                || (it.state ?: "").contains(search, ignoreCase = true)
                || (it.city ?: "").contains(search, ignoreCase = true)
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(modifier = Modifier.fillMaxWidth().padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Sales Leads", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.weight(1f))
            Text("${leads.size}", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.Bold)
        }

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
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(lead.providerName ?: "Unknown Agency", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                                    if (!lead.contactName.isNullOrBlank()) Text(lead.contactName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                if (!lead.status.isNullOrBlank()) {
                                    val color = when (lead.status) { "contacted" -> SuccessGreen; "interested" -> Teal500; else -> Dark400 }
                                    Text(lead.status.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = color)
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                if (!lead.state.isNullOrBlank()) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.Place, contentDescription = null, tint = Teal500, modifier = Modifier.size(14.dp))
                                        Text("${lead.city ?: ""} ${lead.state}".trim(), style = MaterialTheme.typography.labelSmall, color = Teal500)
                                    }
                                }
                                Text("Emails: ${lead.emailSendCount}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("Calls: ${lead.callCount}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (!lead.phone.isNullOrBlank()) {
                                    OutlinedButton(
                                        onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${lead.phone}"))) },
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                    ) {
                                        Icon(Icons.Filled.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Call", style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                                if (!lead.email.isNullOrBlank()) {
                                    OutlinedButton(
                                        onClick = { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${lead.email}"))) },
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                    ) {
                                        Icon(Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Email", style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
