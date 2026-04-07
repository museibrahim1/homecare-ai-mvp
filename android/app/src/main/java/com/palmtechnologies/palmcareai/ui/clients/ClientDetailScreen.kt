package com.palmtechnologies.palmcareai.ui.clients

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.palmtechnologies.palmcareai.navigation.NavRoutes
import com.palmtechnologies.palmcareai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientDetailScreen(clientId: String, navController: NavController, viewModel: ClientsViewModel = hiltViewModel()) {
    val client by viewModel.selectedClient.collectAsState()

    LaunchedEffect(clientId) { viewModel.loadClient(clientId) }

    val c = client
    if (c == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Teal500)
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(c.displayName) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier.size(72.dp).clip(CircleShape).background(Teal600.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(c.displayName.take(1).uppercase(), style = MaterialTheme.typography.headlineLarge, color = Teal500, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(c.displayName, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onSurface)
                        if (!c.status.isNullOrBlank()) {
                            Box(
                                modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(SuccessGreen.copy(alpha = 0.15f)).padding(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text(c.status.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelSmall, color = SuccessGreen)
                            }
                        }
                    }
                }
            }

            item { SectionHeader("Contact Information") }
            item { InfoRow(Icons.Filled.Email, "Email", c.email ?: "Not provided") }
            item { InfoRow(Icons.Filled.Phone, "Phone", c.phone ?: "Not provided") }
            item { InfoRow(Icons.Filled.LocationOn, "Address", c.address ?: "Not provided") }
            item { InfoRow(Icons.Filled.Place, "City/State", listOfNotNull(c.city, c.state).joinToString(", ").ifBlank { "Not provided" }) }

            if (!c.emergencyContactName.isNullOrBlank()) {
                item { SectionHeader("Emergency Contact") }
                item { InfoRow(Icons.Filled.Person, "Name", c.emergencyContactName) }
                item { InfoRow(Icons.Filled.Phone, "Phone", c.emergencyContactPhone ?: "N/A") }
                item { InfoRow(Icons.Filled.FamilyRestroom, "Relationship", c.emergencyContactRelationship ?: "N/A") }
            }

            if (!c.insuranceProvider.isNullOrBlank()) {
                item { SectionHeader("Insurance") }
                item { InfoRow(Icons.Filled.HealthAndSafety, "Provider", c.insuranceProvider) }
                item { InfoRow(Icons.Filled.Badge, "ID", c.insuranceId ?: "N/A") }
            }

            if (!c.medicalConditions.isNullOrBlank() || !c.medications.isNullOrBlank()) {
                item { SectionHeader("Medical") }
                if (!c.medicalConditions.isNullOrBlank()) item { InfoRow(Icons.Filled.MedicalServices, "Conditions", c.medicalConditions) }
                if (!c.medications.isNullOrBlank()) item { InfoRow(Icons.Filled.Medication, "Medications", c.medications) }
                if (!c.allergies.isNullOrBlank()) item { InfoRow(Icons.Filled.Warning, "Allergies", c.allergies) }
            }

            if (!c.notes.isNullOrBlank()) {
                item { SectionHeader("Notes") }
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Text(c.notes, modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }

            item {
                Button(
                    onClick = { navController.navigate(NavRoutes.RECORD) },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                ) {
                    Icon(Icons.Filled.Mic, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Start Assessment", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = Teal500, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}
