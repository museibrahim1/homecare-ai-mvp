package com.palmtechnologies.palmcareai.ui.record

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.palmtechnologies.palmcareai.data.models.Client
import com.palmtechnologies.palmcareai.data.models.PIPELINE_DISPLAY_STEPS
import com.palmtechnologies.palmcareai.data.models.pipelineCompleteForUi
import com.palmtechnologies.palmcareai.data.models.stepStatus
import com.palmtechnologies.palmcareai.data.models.uiProgress
import com.palmtechnologies.palmcareai.navigation.NavRoutes
import com.palmtechnologies.palmcareai.ui.theme.*
import kotlin.math.sin

private val RecordBg = Color(0xFF0C0C0E)

private val speakerColors = listOf(Teal500, PalmBlue, PalmPurple, WarningAmber)

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun RecordScreen(navController: NavController, viewModel: RecordViewModel = hiltViewModel()) {
    val micPermission = rememberPermissionState(Manifest.permission.RECORD_AUDIO)
    val clients by viewModel.clients.collectAsState()
    val selectedClient by viewModel.selectedClient.collectAsState()
    val isRecording by viewModel.isRecording.collectAsState()
    val recordingSeconds by viewModel.recordingSeconds.collectAsState()
    val liveTranscript by viewModel.liveTranscript.collectAsState()
    val liveSegments by viewModel.liveSegments.collectAsState()
    val isUploading by viewModel.isUploading.collectAsState()
    val uploadProgress by viewModel.uploadProgress.collectAsState()
    val uploadResult by viewModel.uploadResult.collectAsState()
    val pipelineStatus by viewModel.pipelineStatus.collectAsState()
    val error by viewModel.error.collectAsState()
    val showUpgrade by viewModel.showUpgradeDialog.collectAsState()
    var showClientPicker by remember { mutableStateOf(false) }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? -> uri?.let { viewModel.uploadAudioFile(it) } }

    LaunchedEffect(Unit) { viewModel.loadClients() }

    if (!micPermission.status.isGranted) {
        LaunchedEffect(Unit) { micPermission.launchPermissionRequest() }
    }

    if (showUpgrade) {
        AlertDialog(
            onDismissRequest = { viewModel.dismissUpgradeDialog() },
            title = { Text("Usage Limit Reached") },
            text = { Text("You've reached your assessment limit for this billing period. Upgrade your plan to continue.") },
            confirmButton = {
                Button(
                    onClick = { viewModel.dismissUpgradeDialog(); navController.navigate(NavRoutes.SUBSCRIPTION) },
                    colors = ButtonDefaults.buttonColors(containerColor = Teal500)
                ) { Text("Upgrade") }
            },
            dismissButton = { TextButton(onClick = { viewModel.dismissUpgradeDialog() }) { Text("Cancel") } }
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(RecordBg)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top bar — client chip + timer
            TopBar(
                selectedClient = selectedClient,
                isRecording = isRecording,
                recordingSeconds = recordingSeconds,
                onClientPickerTap = { showClientPicker = true }
            )

            if (isRecording) {
                RecordingLayout(
                    recordingSeconds = recordingSeconds,
                    liveSegments = liveSegments,
                    liveTranscript = liveTranscript,
                    onStopTap = { viewModel.stopRecording() }
                )
            } else if (pipelineStatus != null || isUploading) {
                // Show idle orb behind processing overlay
                IdleLayout(
                    selectedClient = selectedClient,
                    onOrbTap = {},
                    onUploadTap = {},
                    enabled = false
                )
            } else {
                IdleLayout(
                    selectedClient = selectedClient,
                    onOrbTap = {
                        if (selectedClient != null) viewModel.startRecording()
                    },
                    onUploadTap = { filePickerLauncher.launch("audio/*") },
                    enabled = selectedClient != null
                )
            }
        }

        // Processing overlay (bottom card)
        if (pipelineStatus != null) {
            ProcessingCard(
                pipelineStatus = pipelineStatus,
                uploadProgress = uploadProgress,
                onViewResults = {
                    uploadResult?.visitId?.let { navController.navigate(NavRoutes.visitDetail(it)) }
                    viewModel.resetState()
                },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 100.dp)
            )
        } else if (isUploading) {
            UploadingCard(
                uploadProgress = uploadProgress,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 100.dp)
            )
        }

        // Error
        if (error != null) {
            Text(
                error!!,
                color = ErrorRed,
                fontSize = 12.sp,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 70.dp)
            )
        }
    }

    if (showClientPicker) {
        ClientPickerDialog(
            clients = clients,
            onSelect = { viewModel.selectClient(it); showClientPicker = false },
            onDismiss = { showClientPicker = false },
            onAddNew = { showClientPicker = false; navController.navigate(NavRoutes.ADD_CLIENT) }
        )
    }
}

@Composable
private fun TopBar(
    selectedClient: Client?,
    isRecording: Boolean,
    recordingSeconds: Int,
    onClientPickerTap: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Client chip
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .background(Color.White.copy(alpha = 0.06f))
                .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(20.dp))
                .clickable { onClientPickerTap() }
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(Teal500.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Person, contentDescription = null, tint = Teal500, modifier = Modifier.size(12.dp))
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                selectedClient?.displayName ?: "Select Client",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (selectedClient != null) Color.White else Color.White.copy(alpha = 0.5f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.widthIn(max = 150.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = Color.White.copy(alpha = 0.4f), modifier = Modifier.size(16.dp))
        }

        Spacer(modifier = Modifier.weight(1f))

        // Timer chip (recording only)
        if (isRecording) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.Red.copy(alpha = 0.15f))
                    .border(1.dp, Color.Red.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(modifier = Modifier.size(7.dp).clip(CircleShape).background(Color.Red))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    formatTime(recordingSeconds),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                )
            }
        }
    }
}

@Composable
private fun IdleLayout(
    selectedClient: Client?,
    onOrbTap: () -> Unit,
    onUploadTap: () -> Unit,
    enabled: Boolean
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.weight(1f))

        VoiceOrb(isActive = false, audioLevel = 0f, size = 240, onClick = onOrbTap, enabled = enabled)

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            if (selectedClient == null) "Select a client to begin" else "Tap to start recording",
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = Teal400
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "AI handles the rest",
            fontSize = 12.sp,
            color = Color.White.copy(alpha = 0.4f)
        )

        Spacer(modifier = Modifier.height(20.dp))

        // Upload audio file button
        if (enabled) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.White.copy(alpha = 0.06f))
                    .border(1.dp, Teal500.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
                    .clickable { onUploadTap() }
                    .padding(horizontal = 18.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Filled.UploadFile, contentDescription = null, tint = Teal400, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Upload Audio File", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Teal400)
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Feature pills
        Row(
            modifier = Modifier.padding(bottom = 90.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            FeaturePill("mic.fill", "Live Transcript")
            FeaturePill("doc.text", "Smart Notes")
            FeaturePill("checkmark.shield", "HIPAA Safe")
        }
    }
}

@Composable
private fun RecordingLayout(
    recordingSeconds: Int,
    liveSegments: List<com.palmtechnologies.palmcareai.data.service.TranscriptSegment>,
    liveTranscript: String,
    onStopTap: () -> Unit
) {
    val listState = rememberLazyListState()

    LaunchedEffect(liveSegments.size) {
        if (liveSegments.isNotEmpty()) listState.animateScrollToItem(liveSegments.size - 1)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Orb area (30% height)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.30f),
            contentAlignment = Alignment.Center
        ) {
            VoiceOrb(isActive = true, audioLevel = 0.4f, size = 120, onClick = onStopTap, enabled = true)
        }

        // LIVE TRANSCRIPT label
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(Color.Green.copy(alpha = 0.8f)))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                "LIVE TRANSCRIPT",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White.copy(alpha = 0.4f),
                letterSpacing = 1.5.sp
            )
        }

        // Transcript content
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(0.70f)
                .padding(horizontal = 20.dp),
            contentPadding = PaddingValues(top = 8.dp, bottom = 100.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (liveSegments.isNotEmpty()) {
                items(liveSegments) { seg ->
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val colorIdx = seg.speaker.filter { it.isDigit() }.toIntOrNull() ?: 0
                            val dotColor = speakerColors[colorIdx % speakerColors.size]
                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(dotColor))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                seg.speaker,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = dotColor
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            seg.text,
                            fontSize = 15.sp,
                            color = Color.White.copy(alpha = 0.88f),
                            lineHeight = 22.sp
                        )
                    }
                }
            } else {
                item {
                    Text(
                        liveTranscript.ifBlank { "Listening..." },
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.4f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

@Composable
private fun VoiceOrb(
    isActive: Boolean,
    audioLevel: Float,
    size: Int,
    onClick: () -> Unit,
    enabled: Boolean
) {
    val infiniteTransition = rememberInfiniteTransition(label = "orb")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(12000, easing = LinearEasing)),
        label = "rotation"
    )
    val morphPhase by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(3000, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "morph"
    )

    val innerSize = if (isActive) (size * 0.85f).toInt() else 140
    val orbAlpha = if (enabled) 1f else 0.5f

    Box(
        modifier = Modifier
            .size(size.dp)
            .clickable(enabled = enabled) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        // Outer rings
        for (ring in 0 until 3) {
            val ringSize = (if (isActive) 80 else 170) + ring * 30 + (audioLevel * 15).toInt()
            Box(
                modifier = Modifier
                    .size(ringSize.dp)
                    .rotate(rotation + ring * 40f)
                    .border(
                        width = if (ring == 0) 2.dp else 1.5.dp,
                        brush = Brush.sweepGradient(
                            listOf(
                                Teal500.copy(alpha = 0.3f - ring * 0.08f),
                                PalmAccent.copy(alpha = 0.2f - ring * 0.06f),
                                Teal700.copy(alpha = 0.15f),
                                Teal500.copy(alpha = 0.3f - ring * 0.08f)
                            )
                        ),
                        shape = CircleShape
                    )
            )
        }

        // Glow blur
        Box(
            modifier = Modifier
                .size((innerSize + 30).dp)
                .blur(20.dp)
                .background(
                    if (isActive) Teal500.copy(alpha = 0.25f)
                    else Teal500.copy(alpha = 0.12f),
                    CircleShape
                )
        )

        // Main orb
        Box(
            modifier = Modifier
                .size(innerSize.dp)
                .shadow(
                    if (isActive) 30.dp else 15.dp,
                    CircleShape,
                    ambientColor = Teal500.copy(alpha = if (isActive) 0.6f else 0.3f)
                )
                .clip(CircleShape)
                .background(
                    Brush.sweepGradient(
                        if (isActive) listOf(Teal500, PalmAccent, PalmPurple, Teal400, Teal500)
                        else listOf(
                            Teal500.copy(alpha = 0.7f),
                            PalmAccent.copy(alpha = 0.5f),
                            Teal700.copy(alpha = 0.6f),
                            Teal500.copy(alpha = 0.7f)
                        )
                    )
                )
                .rotate(rotation),
            contentAlignment = Alignment.Center
        ) {
            // Highlight
            Box(
                modifier = Modifier
                    .size(innerSize.dp)
                    .background(
                        Brush.radialGradient(
                            listOf(Color.White.copy(alpha = 0.2f), Color.Transparent)
                        ),
                        CircleShape
                    )
            )
        }

        // Center content (mic or bars)
        if (isActive) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(3.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (i in 0 until 5) {
                    val barHeight = (6f + audioLevel * 24f + sin(morphPhase * Math.PI.toFloat() + i * 1.2f) * 8f).coerceAtLeast(6f)
                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(barHeight.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Color.White)
                    )
                }
            }
        } else {
            Icon(
                Icons.Filled.Mic,
                contentDescription = "Record",
                tint = Color.White.copy(alpha = orbAlpha),
                modifier = Modifier.size(40.dp)
            )
        }
    }
}

@Composable
private fun ProcessingCard(
    pipelineStatus: com.palmtechnologies.palmcareai.data.models.PipelineStatus?,
    uploadProgress: String,
    onViewResults: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF141418).copy(alpha = 0.95f)),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(listOf(Teal500.copy(alpha = 0.3f), Teal500.copy(alpha = 0.3f)))
        )
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    uploadProgress.ifBlank { "Processing assessment..." },
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            PIPELINE_DISPLAY_STEPS.forEach { (step, label) ->
                val status = pipelineStatus?.stepStatus(step) ?: "pending"
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.size(14.dp), contentAlignment = Alignment.Center) {
                        when (status) {
                            "completed" -> Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = SuccessGreen, modifier = Modifier.size(12.dp))
                            "processing", "in_progress" -> CircularProgressIndicator(modifier = Modifier.size(10.dp), color = Teal500, strokeWidth = 1.5.dp)
                            "failed" -> Icon(Icons.Filled.Cancel, contentDescription = null, tint = ErrorRed, modifier = Modifier.size(12.dp))
                            else -> Icon(Icons.Filled.Circle, contentDescription = null, tint = Color.White.copy(alpha = 0.3f), modifier = Modifier.size(8.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        label,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White.copy(alpha = 0.85f),
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        status.replaceFirstChar { it.uppercase() },
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = when (status) {
                            "completed" -> SuccessGreen
                            "processing", "in_progress" -> Teal500
                            "failed" -> ErrorRed
                            else -> Color.White.copy(alpha = 0.3f)
                        }
                    )
                }
            }

            if (pipelineStatus?.pipelineCompleteForUi() == true) {
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onViewResults,
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Teal500)
                ) {
                    Text("View Results", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
private fun UploadingCard(uploadProgress: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF141418).copy(alpha = 0.95f)),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(listOf(Teal500.copy(alpha = 0.3f), Teal500.copy(alpha = 0.3f)))
        )
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                uploadProgress.ifBlank { "Uploading recording..." },
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
        }
    }
}

@Composable
private fun FeaturePill(iconName: String, label: String) {
    val icon = when (iconName) {
        "mic.fill" -> Icons.Filled.Mic
        "doc.text" -> Icons.Filled.Description
        else -> Icons.Filled.VerifiedUser
    }
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White.copy(alpha = 0.04f))
            .border(1.dp, Color.White.copy(alpha = 0.06f), RoundedCornerShape(12.dp))
            .padding(horizontal = 8.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = Color.White.copy(alpha = 0.35f), modifier = Modifier.size(10.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = Color.White.copy(alpha = 0.35f))
    }
}

@Composable
private fun ClientPickerDialog(
    clients: List<Client>,
    onSelect: (Client) -> Unit,
    onDismiss: () -> Unit,
    onAddNew: () -> Unit
) {
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
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) }
                )
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = onAddNew, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Filled.AddCircle, contentDescription = null, tint = Teal500, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add New Client", color = Teal500, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                }
                HorizontalDivider()
                LazyColumn(modifier = Modifier.heightIn(max = 300.dp)) {
                    items(filtered) { client ->
                        TextButton(onClick = { onSelect(client) }, modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text(client.displayName, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
                                if (!client.primaryDiagnosis.isNullOrBlank()) {
                                    Text(client.primaryDiagnosis, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Done") } }
    )
}

private fun formatTime(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%02d:%02d".format(m, s)
}
