package com.palmtechnologies.palmcareai.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.palmtechnologies.palmcareai.ui.home.HomeStatCard
import com.palmtechnologies.palmcareai.ui.theme.*

@Composable
fun AnalyticsScreen(viewModel: AdminViewModel = hiltViewModel()) {
    val leads by viewModel.salesLeads.collectAsState()
    val investors by viewModel.investors.collectAsState()
    val plan by viewModel.weeklyPlan.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadSalesLeads()
        viewModel.loadInvestors()
        viewModel.loadWeeklyPlan()
    }

    val totalLeads = leads.size
    val totalInvestors = investors.size
    val emailsSent = leads.sumOf { it.emailSendCount } + investors.sumOf { it.emailSendCount }
    val emailsOpened = investors.sumOf { it.emailOpenCount }
    val totalCalls = leads.sumOf { it.callCount }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { Text("Analytics", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground) }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                HomeStatCard(Modifier.weight(1f), "Total Leads", "$totalLeads", Icons.Filled.People, Teal500, Teal500.copy(alpha = 0.08f))
                HomeStatCard(Modifier.weight(1f), "Investors", "$totalInvestors", Icons.Filled.AttachMoney, Teal400, Teal400.copy(alpha = 0.08f))
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                HomeStatCard(Modifier.weight(1f), "Emails Sent", "$emailsSent", Icons.Filled.Email, Teal600, Teal600.copy(alpha = 0.08f))
                HomeStatCard(Modifier.weight(1f), "Opens", "$emailsOpened", Icons.Filled.Visibility, SuccessGreen, SuccessGreen.copy(alpha = 0.08f))
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                HomeStatCard(Modifier.weight(1f), "Calls Made", "$totalCalls", Icons.Filled.Phone, WarningAmber, WarningAmber.copy(alpha = 0.08f))
                HomeStatCard(Modifier.weight(1f), "Unsent Emails", "${(plan?.unsentAgencyEmails ?: 0) + (plan?.unsentInvestorEmails ?: 0)}", Icons.Filled.MarkEmailUnread, ErrorRed, ErrorRed.copy(alpha = 0.08f))
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Outreach Summary", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    AnalyticsRow("Agency leads with email", "${leads.count { !it.email.isNullOrBlank() }}")
                    AnalyticsRow("Agency leads with phone", "${leads.count { !it.phone.isNullOrBlank() }}")
                    AnalyticsRow("Investors contacted", "${investors.count { it.emailSendCount > 0 }}")
                    AnalyticsRow("Open rate", if (emailsSent > 0) "${"%.1f".format(emailsOpened.toFloat() / emailsSent * 100)}%" else "N/A")
                }
            }
        }
    }
}

@Composable
private fun AnalyticsRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
    }
}
