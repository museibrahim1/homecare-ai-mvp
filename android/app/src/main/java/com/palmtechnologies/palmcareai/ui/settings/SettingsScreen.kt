package com.palmtechnologies.palmcareai.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.palmtechnologies.palmcareai.ui.auth.AuthViewModel
import com.palmtechnologies.palmcareai.ui.theme.*

@Composable
fun SettingsScreen(navController: NavController, onLogout: () -> Unit, authViewModel: AuthViewModel = hiltViewModel()) {
    val user by authViewModel.user.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text("Settings", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground)
            Spacer(modifier = Modifier.height(16.dp))
        }

        item {
            Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(56.dp).clip(CircleShape).background(Teal600.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                        Text(user?.fullName?.take(1)?.uppercase() ?: "?", style = MaterialTheme.typography.headlineMedium, color = Teal500, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(user?.fullName ?: "User", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
                        Text(user?.email ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (!user?.agencyName.isNullOrBlank()) {
                            Text(user!!.agencyName!!, style = MaterialTheme.typography.bodySmall, color = Teal500)
                        }
                    }
                }
            }
        }

        item { SettingsSection("General") }
        item { SettingsRow(Icons.Filled.CalendarMonth, "Calendar") { navController.navigate(NavRoutes.CALENDAR) } }
        item { SettingsRow(Icons.Filled.FolderOpen, "Documents") { navController.navigate(NavRoutes.DOCUMENTS) } }
        item { SettingsRow(Icons.Filled.CreditCard, "Subscription") { navController.navigate(NavRoutes.SUBSCRIPTION) } }

        item { SettingsSection("Support") }
        item { SettingsRow(Icons.Filled.Help, "Help & FAQ") {} }
        item { SettingsRow(Icons.Filled.PrivacyTip, "Privacy Policy") {} }
        item { SettingsRow(Icons.Filled.Gavel, "Terms of Service") {} }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            Button(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ErrorRed)
            ) {
                Icon(Icons.Filled.Logout, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out", fontWeight = FontWeight.SemiBold)
            }
        }

        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text("PalmCare AI v1.0.0", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun SettingsSection(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
}

@Composable
private fun SettingsRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = Teal500, modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.width(14.dp))
            Text(label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
        }
    }
}
