package com.palmtechnologies.palmcareai.ui.clients

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.palmtechnologies.palmcareai.data.models.ClientCreate
import com.palmtechnologies.palmcareai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddClientScreen(navController: NavController, viewModel: ClientsViewModel = hiltViewModel()) {
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var dateOfBirth by remember { mutableStateOf("") }
    var emergencyName by remember { mutableStateOf("") }
    var emergencyPhone by remember { mutableStateOf("") }
    var emergencyRelationship by remember { mutableStateOf("") }
    var insuranceProvider by remember { mutableStateOf("") }
    var insuranceId by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Client") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(modifier = Modifier.height(4.dp))
            FormField("Full Name *", fullName) { fullName = it }
            FormField("Email", email, KeyboardType.Email) { email = it }
            FormField("Phone", phone, KeyboardType.Phone) { phone = it }
            FormField("Address", address) { address = it }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.weight(1f)) { FormField("City", city) { city = it } }
                Box(modifier = Modifier.weight(1f)) { FormField("State", state) { state = it } }
            }
            FormField("Date of Birth", dateOfBirth) { dateOfBirth = it }

            Text("Emergency Contact", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
            FormField("Name", emergencyName) { emergencyName = it }
            FormField("Phone", emergencyPhone, KeyboardType.Phone) { emergencyPhone = it }
            FormField("Relationship", emergencyRelationship) { emergencyRelationship = it }

            Text("Insurance", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
            FormField("Provider", insuranceProvider) { insuranceProvider = it }
            FormField("Insurance ID", insuranceId) { insuranceId = it }

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes") },
                modifier = Modifier.fillMaxWidth().height(120.dp),
                shape = RoundedCornerShape(12.dp),
                maxLines = 5
            )

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = {
                    viewModel.createClient(
                        ClientCreate(
                            fullName = fullName,
                            email = email.ifBlank { null },
                            phone = phone.ifBlank { null },
                            address = address.ifBlank { null },
                            city = city.ifBlank { null },
                            state = state.ifBlank { null },
                            dateOfBirth = dateOfBirth.ifBlank { null },
                            emergencyContactName = emergencyName.ifBlank { null },
                            emergencyContactPhone = emergencyPhone.ifBlank { null },
                            emergencyContactRelationship = emergencyRelationship.ifBlank { null },
                            insuranceProvider = insuranceProvider.ifBlank { null },
                            insuranceId = insuranceId.ifBlank { null },
                            notes = notes.ifBlank { null }
                        )
                    ) { navController.popBackStack() }
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                enabled = fullName.isNotBlank() && !isLoading,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Teal600)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                } else {
                    Text("Save Client", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun FormField(label: String, value: String, keyboardType: KeyboardType = KeyboardType.Text, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        shape = RoundedCornerShape(12.dp),
        singleLine = true
    )
}
