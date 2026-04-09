package com.palmtechnologies.palmcareai.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.palmtechnologies.palmcareai.data.local.TokenManager
import com.palmtechnologies.palmcareai.navigation.NavRoutes
import com.palmtechnologies.palmcareai.ui.auth.AuthViewModel
import com.palmtechnologies.palmcareai.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SettingsScreen(
    navController: NavController,
    onLogout: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    val user by authViewModel.user.collectAsState()
    val subscription by settingsViewModel.subscription.collectAsState()
    val usage by settingsViewModel.usage.collectAsState()
    val isDarkMode by settingsViewModel.isDarkMode.collectAsState()
    val notificationsEnabled by settingsViewModel.notificationsEnabled.collectAsState()
    val backgroundRecording by settingsViewModel.backgroundRecording.collectAsState()
    val biometricEnabled by settingsViewModel.biometricEnabled.collectAsState()
    var showEditProfile by remember { mutableStateOf(false) }
    var showChangePassword by remember { mutableStateOf(false) }
    var showLogoutConfirm by remember { mutableStateOf(false) }
    val context = LocalContext.current

    LaunchedEffect(Unit) { settingsViewModel.loadData() }

    if (showLogoutConfirm) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirm = false },
            title = { Text("Sign Out") },
            text = { Text("Are you sure you want to sign out?") },
            confirmButton = {
                Button(
                    onClick = { showLogoutConfirm = false; onLogout() },
                    colors = ButtonDefaults.buttonColors(containerColor = ErrorRed)
                ) { Text("Sign Out") }
            },
            dismissButton = { TextButton(onClick = { showLogoutConfirm = false }) { Text("Cancel") } }
        )
    }

    if (showEditProfile) {
        EditProfileDialog(
            currentName = user?.fullName ?: "",
            currentPhone = user?.phone ?: "",
            onDismiss = { showEditProfile = false },
            onSave = { name, phone ->
                settingsViewModel.updateProfile(name, phone)
                showEditProfile = false
            }
        )
    }

    if (showChangePassword) {
        ChangePasswordDialog(
            onDismiss = { showChangePassword = false },
            onSave = { current, new_ ->
                settingsViewModel.changePassword(current, new_)
                showChangePassword = false
            }
        )
    }

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
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.clickable { showEditProfile = true }
            ) {
                Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(56.dp).clip(CircleShape).background(Teal600.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                        Text(user?.fullName?.take(1)?.uppercase() ?: "?", style = MaterialTheme.typography.headlineMedium, color = Teal500, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(user?.fullName ?: "User", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
                        Text(user?.email ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (!user?.agencyName.isNullOrBlank()) {
                            Text(user!!.agencyName!!, style = MaterialTheme.typography.bodySmall, color = Teal500)
                        }
                    }
                    Icon(Icons.Filled.Edit, contentDescription = "Edit", tint = Teal500, modifier = Modifier.size(20.dp))
                }
            }
        }

        item { SettingsSection("Preferences") }
        item {
            SettingsToggle(Icons.Filled.Notifications, "Notifications & Sounds", notificationsEnabled) {
                settingsViewModel.toggleNotifications()
            }
        }
        item {
            SettingsToggle(Icons.Filled.Mic, "Background Recording", backgroundRecording) {
                settingsViewModel.toggleBackgroundRecording()
            }
        }
        item {
            SettingsToggle(Icons.Filled.DarkMode, "Dark Mode", isDarkMode) {
                settingsViewModel.toggleDarkMode()
            }
        }

        item { SettingsSection("Account") }
        item { SettingsRow(Icons.Filled.Lock, "Change Password") { showChangePassword = true } }
        item {
            SettingsToggle(Icons.Filled.Fingerprint, "Login with Biometrics", biometricEnabled) {
                if (!biometricEnabled) {
                    val activity = context as? FragmentActivity
                    if (activity != null) {
                        settingsViewModel.enableBiometric(activity)
                    }
                } else {
                    settingsViewModel.disableBiometric()
                }
            }
        }
        item {
            SettingsRow(Icons.Filled.Email, "Support") {
                val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:support@palmtai.com"))
                context.startActivity(intent)
            }
        }

        item { SettingsSection("Subscription & Billing") }
        item {
            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(modifier = Modifier.padding(16.dp).clickable { navController.navigate(NavRoutes.SUBSCRIPTION) }, verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.CreditCard, contentDescription = null, tint = Teal500, modifier = Modifier.size(22.dp))
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(subscription?.plan?.replaceFirstChar { it.uppercase() } ?: "Free", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
                        if (usage != null) {
                            Text("${usage!!.visitsThisMonth} / ${usage!!.visitsLimit} assessments", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Text("Manage", style = MaterialTheme.typography.labelSmall, color = Teal500)
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                }
            }
        }

        item { SettingsSection("Integrations") }
        item {
            SettingsRow(Icons.Filled.CalendarMonth, if (user?.googleCalendarConnected == true) "Google Calendar (Connected)" else "Connect Google Calendar") {
                navController.navigate(NavRoutes.CALENDAR)
            }
        }

        item { SettingsSection("Legal") }
        item { SettingsRow(Icons.Filled.PrivacyTip, "Terms & Privacy Policy") {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://palmcareai.com/privacy"))
            context.startActivity(intent)
        } }
        item {
            SettingsRow(Icons.Filled.DeleteSweep, "Clear Cache") {
                settingsViewModel.clearCache(context)
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        item {
            Button(
                onClick = { showLogoutConfirm = true },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ErrorRed)
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
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
private fun EditProfileDialog(currentName: String, currentPhone: String, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var name by remember { mutableStateOf(currentName) }
    var phone by remember { mutableStateOf(currentPhone) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Profile") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true)
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true)
            }
        },
        confirmButton = {
            Button(onClick = { onSave(name, phone) }, colors = ButtonDefaults.buttonColors(containerColor = Teal600)) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun ChangePasswordDialog(onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var current by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Change Password") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(value = current, onValueChange = { current = it }, label = { Text("Current Password") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true, visualTransformation = PasswordVisualTransformation())
                OutlinedTextField(value = newPass, onValueChange = { newPass = it }, label = { Text("New Password") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true, visualTransformation = PasswordVisualTransformation())
                OutlinedTextField(value = confirm, onValueChange = { confirm = it }, label = { Text("Confirm Password") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true, visualTransformation = PasswordVisualTransformation())
            }
        },
        confirmButton = {
            Button(
                onClick = { if (newPass == confirm && newPass.isNotBlank()) onSave(current, newPass) },
                enabled = newPass == confirm && newPass.length >= 6 && current.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Teal600)
            ) { Text("Change") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
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

@Composable
private fun SettingsToggle(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, checked: Boolean, onToggle: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = Teal500, modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.width(14.dp))
            Text(label, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
            Switch(checked = checked, onCheckedChange = { onToggle() }, colors = SwitchDefaults.colors(checkedTrackColor = Teal500))
        }
    }
}
