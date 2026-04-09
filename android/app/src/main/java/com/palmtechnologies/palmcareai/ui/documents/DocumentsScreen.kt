package com.palmtechnologies.palmcareai.ui.documents

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.palmtechnologies.palmcareai.data.models.DocumentItem
import com.palmtechnologies.palmcareai.ui.theme.*

@Composable
fun DocumentsScreen(viewModel: DocumentsViewModel = hiltViewModel()) {
    val documents by viewModel.documents.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) { viewModel.loadDocuments() }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Text("Documents", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(20.dp))

        if (isLoading && documents.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Teal500) }
        } else if (documents.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.FolderOpen, contentDescription = null, tint = Teal500.copy(alpha = 0.4f), modifier = Modifier.size(48.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("No documents yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Documents from assessments will appear here", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            LazyColumn(contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(documents) { doc ->
                    DocumentCard(doc) {
                        doc.url?.let { url ->
                            try {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            } catch (_: Exception) {}
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DocumentCard(doc: DocumentItem, onOpen: () -> Unit) {
    val icon = when (doc.type?.lowercase()) {
        "contract" -> Icons.Filled.Description
        "note", "soap_note" -> Icons.Filled.NoteAlt
        "transcript" -> Icons.Filled.RecordVoiceOver
        "timesheet", "csv" -> Icons.Filled.TableChart
        "pdf" -> Icons.Filled.PictureAsPdf
        else -> Icons.Filled.InsertDriveFile
    }

    val typeColor = when (doc.type?.lowercase()) {
        "contract" -> Teal500
        "note", "soap_note" -> WarningAmber
        "transcript" -> Teal400
        else -> Dark400
    }

    Card(
        modifier = Modifier.fillMaxWidth().clickable(enabled = doc.url != null, onClick = onOpen),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = typeColor, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(doc.name ?: doc.filename ?: "Document", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(doc.type?.replaceFirstChar { it.uppercase() } ?: "File", style = MaterialTheme.typography.bodySmall, color = typeColor)
                    if (!doc.createdAt.isNullOrBlank()) {
                        Text(doc.createdAt.take(10), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (doc.url != null) {
                Icon(Icons.Filled.OpenInNew, contentDescription = "Open", tint = Teal500, modifier = Modifier.size(20.dp))
            }
        }
    }
}
