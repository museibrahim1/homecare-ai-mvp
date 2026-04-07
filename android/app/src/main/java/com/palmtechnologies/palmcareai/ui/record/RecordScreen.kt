package com.palmtechnologies.palmcareai.ui.record

import android.Manifest
import androidx.compose.animation.core.*
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.palmtechnologies.palmcareai.data.models.Client
import com.palmtechnologies.palmcareai.navigation.NavRoutes
import com.palmtechnologies.palmcareai.ui.theme.*

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun RecordScreen(navController: NavController, viewModel: RecordViewModel = hiltViewModel()) {
    val micPermission = rememberPermissionState(Manifest.permission.RECORD_AUDIO)
    val clients by viewModel.clients.collectAsState()
    val selectedClient by viewModel.selectedClient.collectAsState()
    val isRecording by viewModel.isRecording.collectAsState()
    val recordingSeconds by viewModel.recordingSeconds.collectAsState()
    val liveTranscript by viewModel.liveTranscript.collectAsState()
    val isUploading by viewModel.isUploading.collectAsState()
    val uploadResult by viewModel.uploadResult.collectAsState()
    val pipelineStatus by viewModel.pipelineStatus.collectAsState()
    val error by viewModel.error.collectAsState()
    var showClientPicker by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadClients() }

    if (!micPermission.status.isGranted) {
        LaunchedEffect(Unit) { micPermission.launchPermissionRequest() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Palm It", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground)
        Spacer(modifier = Modifier.height(4.dp))
        Text("Record a care assessment", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)

        Spacer(modifier = Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth().clickable { showClientPicker = true },
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Person, contentDescription = null, tint = Teal500)
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    selectedClient?.displayName ?: "Select a client",
                    style = MaterialTheme.typography.titleMedium,
                    color = if (selectedClient != null) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f)
                )
                Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        if (pipelineStatus != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Processing Assessment", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Spacer(modifier = Modifier.height(12.dp))
                    LinearProgressIndicator(
                        progress = { pipelineStatus?.progress ?: 0f },
                        modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                        color = Teal500,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        pipelineStatus?.currentStep?.replace("_", " ")?.replaceFirstChar { it.uppercase() } ?: "Starting...",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (pipelineStatus?.status == "completed") {
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = {
                                uploadResult?.visitId?.let { navController.navigate(NavRoutes.visitDetail(it)) }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Teal600)
                        ) {
                            Text("View Results")
                        }
                    }
                }
            }
        } else if (isUploading) {
            CircularProgressIndicator(color = Teal500)
            Spacer(modifier = Modifier.height(8.dp))
            Text("Uploading recording...", color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            if (isRecording) {
                Text(liveTranscript.ifBlank { "Listening..." }, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp))
                Spacer(modifier = Modifier.height(16.dp))
            }

            Text(
                formatTime(recordingSeconds),
                style = MaterialTheme.typography.displayLarge,
                color = if (isRecording) ErrorRed else MaterialTheme.colorScheme.onBackground,
                fontSize = 48.sp
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        if (error != null) {
            Text(error!!, color = ErrorRed, style = MaterialTheme.typography.bodySmall)
            Spacer(modifier = Modifier.height(8.dp))
        }

        if (pipelineStatus == null && !isUploading) {
            val pulseScale = if (isRecording) {
                val inf = rememberInfiniteTransition(label = "pulse")
                inf.animateFloat(1f, 1.15f, infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "scale").value
            } else 1f

            Box(
                modifier = Modifier
                    .size(88.dp)
                    .scale(pulseScale)
                    .clip(CircleShape)
                    .background(if (isRecording) ErrorRed else Teal600)
                    .clickable(enabled = selectedClient != null || isRecording) {
                        if (isRecording) viewModel.stopRecording()
                        else viewModel.startRecording()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isRecording) Icons.Filled.Stop else Icons.Filled.Mic,
                    contentDescription = if (isRecording) "Stop" else "Record",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            Text(
                if (isRecording) "Tap to stop" else if (selectedClient == null) "Select a client first" else "Tap to record",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(24.dp))
    }

    if (showClientPicker) {
        ClientPickerDialog(
            clients = clients,
            onSelect = { viewModel.selectClient(it); showClientPicker = false },
            onDismiss = { showClientPicker = false }
        )
    }
}

@Composable
private fun ClientPickerDialog(clients: List<Client>, onSelect: (Client) -> Unit, onDismiss: () -> Unit) {
    var search by remember { mutableStateOf("") }
    val filtered = clients.filter { search.isBlank() || it.displayName.contains(search, ignoreCase = true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Select Client") },
        text = {
            Column {
                OutlinedTextField(
                    value = search,
                    onValueChange = { search = it },
                    placeholder = { Text("Search...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.heightIn(max = 300.dp)) {
                    items(filtered) { client ->
                        TextButton(onClick = { onSelect(client) }, modifier = Modifier.fillMaxWidth()) {
                            Text(client.displayName, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Start)
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

private fun formatTime(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%02d:%02d".format(m, s)
}
