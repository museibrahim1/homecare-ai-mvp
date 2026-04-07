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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.palmtechnologies.palmcareai.ui.theme.*

@Composable
fun InvestorsScreen(viewModel: AdminViewModel = hiltViewModel()) {
    val investors by viewModel.investors.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var search by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadInvestors() }

    val filtered = investors.filter {
        search.isBlank() || (it.name ?: "").contains(search, ignoreCase = true)
                || (it.firm ?: "").contains(search, ignoreCase = true)
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Text("Investors", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(20.dp))

        OutlinedTextField(
            value = search, onValueChange = { search = it },
            placeholder = { Text("Search investors...") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            shape = RoundedCornerShape(12.dp), singleLine = true
        )

        Spacer(modifier = Modifier.height(8.dp))

        if (isLoading && investors.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Teal500) }
        } else {
            LazyColumn(contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filtered) { inv ->
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(inv.name ?: "Unknown", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                if (!inv.firm.isNullOrBlank()) Text(inv.firm, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    if (!inv.stage.isNullOrBlank()) Text(inv.stage, style = MaterialTheme.typography.labelSmall, color = Teal500)
                                    Text("Sent: ${inv.emailSendCount}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("Opens: ${inv.emailOpenCount}", style = MaterialTheme.typography.labelSmall, color = SuccessGreen)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
