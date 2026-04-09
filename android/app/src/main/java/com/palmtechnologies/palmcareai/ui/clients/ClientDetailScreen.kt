package com.palmtechnologies.palmcareai.ui.clients

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.platform.LocalContext
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
    val visits by viewModel.clientVisits.collectAsState()
    val context = LocalContext.current

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
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate(NavRoutes.editClient(clientId)) }) {
                        Icon(Icons.Filled.Edit, contentDescription = "Edit", tint = Teal500)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(modifier = Modifier.size(72.dp).clip(CircleShape).background(Teal600.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                            Text(c.displayName.take(1).uppercase(), style = MaterialTheme.typography.headlineLarge, color = Teal500, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(c.displayName, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onSurface)
                        if (!c.primaryDiagnosis.isNullOrBlank()) {
                            Text(c.primaryDiagnosis, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (!c.status.isNullOrBlank()) {
                                Chip(c.status.replaceFirstChar { it.uppercase() }, SuccessGreen)
                            }
                            if (!c.careLevel.isNullOrBlank()) {
                                val color = when (c.careLevel.lowercase()) {
                                    "urgent" -> ErrorRed; "high" -> WarningAmber; "moderate" -> Teal500; else -> Dark400
                                }
                                Chip(c.careLevel.uppercase(), color)
                            }
                            if (!c.dateOfBirth.isNullOrBlank()) {
                                Chip("DOB: ${c.dateOfBirth}", Teal400)
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            if (!c.phone.isNullOrBlank()) {
                                FilledIconButton(
                                    onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${c.phone}"))) },
                                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Teal600)
                                ) { Icon(Icons.Filled.Phone, contentDescription = "Call") }
                            }
                            if (!c.email.isNullOrBlank()) {
                                FilledIconButton(
                                    onClick = { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${c.email}"))) },
                                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Teal600)
                                ) { Icon(Icons.Filled.Email, contentDescription = "Email") }
                            }
                        }
                    }
                }
            }

            item { SectionHeader("Contact Information") }
            item { InfoRow(Icons.Filled.Email, "Email", c.email ?: "Not provided") }
            item { InfoRow(Icons.Filled.Phone, "Phone", c.phone ?: "Not provided") }
            item { InfoRow(Icons.Filled.LocationOn, "Address", c.address ?: "Not provided") }
            item { InfoRow(Icons.Filled.Place, "City/State/Zip", listOfNotNull(c.city, c.state, c.zipCode).joinToString(", ").ifBlank { "Not provided" }) }
            if (!c.gender.isNullOrBlank()) {
                item { InfoRow(Icons.Filled.Person, "Gender", c.gender) }
            }

            if (!c.emergencyContactName.isNullOrBlank()) {
                item { SectionHeader("Emergency Contact") }
                item {
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Warning, contentDescription = null, tint = WarningAmber, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(c.emergencyContactName, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                            }
                            if (!c.emergencyContactRelationship.isNullOrBlank()) {
                                Text(c.emergencyContactRelationship, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (!c.emergencyContactPhone.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(c.emergencyContactPhone, style = MaterialTheme.typography.bodyMedium, color = Teal500,
                                    modifier = Modifier.clickable {
                                        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${c.emergencyContactPhone}")))
                                    }
                                )
                            }
                        }
                    }
                }
            }

            if (!c.insuranceProvider.isNullOrBlank() || !c.medicaidId.isNullOrBlank() || !c.medicareId.isNullOrBlank()) {
                item { SectionHeader("Insurance") }
                if (!c.insuranceProvider.isNullOrBlank()) item { InfoRow(Icons.Filled.HealthAndSafety, "Provider", c.insuranceProvider) }
                if (!c.insuranceId.isNullOrBlank()) item { InfoRow(Icons.Filled.Badge, "Insurance ID", c.insuranceId) }
                if (!c.medicaidId.isNullOrBlank()) item { InfoRow(Icons.Filled.Badge, "Medicaid ID", c.medicaidId) }
                if (!c.medicareId.isNullOrBlank()) item { InfoRow(Icons.Filled.Badge, "Medicare ID", c.medicareId) }
            }

            if (!c.medicalConditions.isNullOrBlank() || !c.medications.isNullOrBlank() || !c.allergies.isNullOrBlank()) {
                item { SectionHeader("Medical") }
                if (!c.medicalConditions.isNullOrBlank()) item { InfoRow(Icons.Filled.MedicalServices, "Conditions", c.medicalConditions) }
                if (!c.medications.isNullOrBlank()) item { InfoRow(Icons.Filled.Medication, "Medications", c.medications) }
                if (!c.allergies.isNullOrBlank()) item { InfoRow(Icons.Filled.Warning, "Allergies", c.allergies) }
            }

            if (!c.notes.isNullOrBlank()) {
                item { SectionHeader("Notes") }
                item {
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Text(c.notes, modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }

            item { SectionHeader("Visits (${visits.size})") }
            if (visits.isEmpty()) {
                item {
                    Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                            Text("No visits yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            items(visits) { visit ->
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { navController.navigate(NavRoutes.visitDetail(visit.id)) },
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(visit.createdAt?.take(10) ?: "Visit", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                            Text(visit.status?.replaceFirstChar { it.uppercase() } ?: "Pending", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
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
private fun Chip(text: String, color: androidx.compose.ui.graphics.Color) {
    Box(modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(color.copy(alpha = 0.15f)).padding(horizontal = 10.dp, vertical = 4.dp)) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = color, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
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
