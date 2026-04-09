package com.palmtechnologies.palmcareai.ui.clients

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.palmtechnologies.palmcareai.ui.theme.Teal500

@Composable
fun EditClientScreen(clientId: String, navController: NavController, viewModel: ClientsViewModel = hiltViewModel()) {
    val client by viewModel.selectedClient.collectAsState()

    LaunchedEffect(clientId) { viewModel.loadClient(clientId) }

    val c = client
    if (c == null || c.id != clientId) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Teal500)
        }
        return
    }

    AddClientScreen(navController = navController, editingClient = c, viewModel = viewModel)
}
