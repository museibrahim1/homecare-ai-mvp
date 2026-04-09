package com.palmtechnologies.palmcareai.ui.clients

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.palmtechnologies.palmcareai.data.models.Client
import com.palmtechnologies.palmcareai.data.models.ClientCreate
import com.palmtechnologies.palmcareai.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddClientScreen(
    navController: NavController,
    editingClient: Client? = null,
    viewModel: ClientsViewModel = hiltViewModel()
) {
    val isEditing = editingClient != null
    var fullName by remember { mutableStateOf(editingClient?.displayName ?: "") }
    var email by remember { mutableStateOf(editingClient?.email ?: "") }
    var phone by remember { mutableStateOf(editingClient?.phone ?: "") }
    var address by remember { mutableStateOf(editingClient?.address ?: "") }
    var city by remember { mutableStateOf(editingClient?.city ?: "") }
    var state by remember { mutableStateOf(editingClient?.state ?: "") }
    var zipCode by remember { mutableStateOf(editingClient?.zipCode ?: "") }
    var dateOfBirth by remember { mutableStateOf(editingClient?.dateOfBirth ?: "") }
    var gender by remember { mutableStateOf(editingClient?.gender ?: "") }
    var careLevel by remember { mutableStateOf(editingClient?.careLevel ?: "") }
    var primaryDiagnosis by remember { mutableStateOf(editingClient?.primaryDiagnosis ?: "") }
    var emergencyName by remember { mutableStateOf(editingClient?.emergencyContactName ?: "") }
    var emergencyPhone by remember { mutableStateOf(editingClient?.emergencyContactPhone ?: "") }
    var emergencyRelationship by remember { mutableStateOf(editingClient?.emergencyContactRelationship ?: "") }
    var insuranceProvider by remember { mutableStateOf(editingClient?.insuranceProvider ?: "") }
    var insuranceId by remember { mutableStateOf(editingClient?.insuranceId ?: "") }
    var medicaidId by remember { mutableStateOf(editingClient?.medicaidId ?: "") }
    var medicareId by remember { mutableStateOf(editingClient?.medicareId ?: "") }
    var medicalConditions by remember { mutableStateOf(editingClient?.medicalConditions ?: "") }
    var medications by remember { mutableStateOf(editingClient?.medications ?: "") }
    var allergies by remember { mutableStateOf(editingClient?.allergies ?: "") }
    var notes by remember { mutableStateOf(editingClient?.notes ?: "") }

    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    val careLevels = listOf("", "LOW", "MODERATE", "HIGH", "URGENT")
    var careLevelExpanded by remember { mutableStateOf(false) }

    val specialties = listOf(
        "", "Alzheimer's/Dementia", "Autism Spectrum", "Cardiac Care",
        "Cerebral Palsy", "COPD", "Diabetes Management", "Home Health Aide",
        "Hospice/Palliative", "Mental Health", "Orthopedic/Rehab",
        "Parkinson's", "Pediatric", "Post-Surgical", "Skilled Nursing",
        "Spinal Cord Injury", "Stroke Recovery", "TBI", "Wound Care", "Other"
    )
    var specialtyExpanded by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isEditing) "Edit Client" else "Add Client") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.weight(1f)) { FormField("Zip Code", zipCode) { zipCode = it } }
                Box(modifier = Modifier.weight(1f)) { FormField("Gender", gender) { gender = it } }
            }
            FormField("Date of Birth", dateOfBirth) { dateOfBirth = it }

            Text("Priority Level", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                careLevels.filter { it.isNotBlank() }.forEach { level ->
                    val selected = careLevel.equals(level, ignoreCase = true)
                    val color = when (level) {
                        "URGENT" -> ErrorRed; "HIGH" -> WarningAmber; "MODERATE" -> Teal500; else -> Dark400
                    }
                    FilterChip(
                        selected = selected,
                        onClick = { careLevel = if (selected) "" else level },
                        label = { Text(level, style = MaterialTheme.typography.labelSmall) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = color.copy(alpha = 0.15f),
                            selectedLabelColor = color
                        )
                    )
                }
            }

            Text("Care Specialty", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
            ExposedDropdownMenuBox(expanded = specialtyExpanded, onExpandedChange = { specialtyExpanded = it }) {
                OutlinedTextField(
                    value = primaryDiagnosis,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Select specialty") },
                    modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
                    shape = RoundedCornerShape(12.dp),
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = specialtyExpanded) }
                )
                ExposedDropdownMenu(expanded = specialtyExpanded, onDismissRequest = { specialtyExpanded = false }) {
                    specialties.forEach { s ->
                        DropdownMenuItem(
                            text = { Text(s.ifBlank { "None" }) },
                            onClick = { primaryDiagnosis = s; specialtyExpanded = false }
                        )
                    }
                }
            }

            Text("Insurance", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
            FormField("Insurance Provider", insuranceProvider) { insuranceProvider = it }
            FormField("Insurance ID", insuranceId) { insuranceId = it }
            FormField("Medicaid ID", medicaidId) { medicaidId = it }
            FormField("Medicare ID", medicareId) { medicareId = it }

            Text("Emergency Contact", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
            FormField("Name", emergencyName) { emergencyName = it }
            FormField("Phone", emergencyPhone, KeyboardType.Phone) { emergencyPhone = it }
            FormField("Relationship", emergencyRelationship) { emergencyRelationship = it }

            Text("Medical Information", style = MaterialTheme.typography.titleMedium, color = Teal500, fontWeight = FontWeight.SemiBold)
            OutlinedTextField(value = medicalConditions, onValueChange = { medicalConditions = it }, label = { Text("Medical Conditions") }, modifier = Modifier.fillMaxWidth().height(100.dp), shape = RoundedCornerShape(12.dp), maxLines = 4)
            OutlinedTextField(value = medications, onValueChange = { medications = it }, label = { Text("Medications") }, modifier = Modifier.fillMaxWidth().height(100.dp), shape = RoundedCornerShape(12.dp), maxLines = 4)
            OutlinedTextField(value = allergies, onValueChange = { allergies = it }, label = { Text("Allergies") }, modifier = Modifier.fillMaxWidth().height(80.dp), shape = RoundedCornerShape(12.dp), maxLines = 3)

            OutlinedTextField(value = notes, onValueChange = { notes = it }, label = { Text("Referral Notes") }, modifier = Modifier.fillMaxWidth().height(120.dp), shape = RoundedCornerShape(12.dp), maxLines = 5)

            if (error != null) {
                Text(error!!, color = ErrorRed, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = {
                    if (editingClient != null) {
                        viewModel.updateClient(editingClient.id, buildUpdateBody(
                            fullName, email, phone, address, city, state, zipCode, dateOfBirth, gender,
                            careLevel, primaryDiagnosis, emergencyName, emergencyPhone, emergencyRelationship,
                            insuranceProvider, insuranceId, medicaidId, medicareId, medicalConditions, medications, allergies, notes
                        )) { navController.popBackStack() }
                    } else {
                        viewModel.createClient(
                            ClientCreate(
                                fullName = fullName,
                                email = email.ifBlank { null },
                                phone = phone.ifBlank { null },
                                address = address.ifBlank { null },
                                city = city.ifBlank { null },
                                state = state.ifBlank { null },
                                zipCode = zipCode.ifBlank { null },
                                dateOfBirth = dateOfBirth.ifBlank { null },
                                gender = gender.ifBlank { null },
                                careLevel = careLevel.ifBlank { null },
                                primaryDiagnosis = primaryDiagnosis.ifBlank { null },
                                emergencyContactName = emergencyName.ifBlank { null },
                                emergencyContactPhone = emergencyPhone.ifBlank { null },
                                emergencyContactRelationship = emergencyRelationship.ifBlank { null },
                                insuranceProvider = insuranceProvider.ifBlank { null },
                                insuranceId = insuranceId.ifBlank { null },
                                medicaidId = medicaidId.ifBlank { null },
                                medicareId = medicareId.ifBlank { null },
                                medicalConditions = medicalConditions.ifBlank { null },
                                medications = medications.ifBlank { null },
                                allergies = allergies.ifBlank { null },
                                notes = notes.ifBlank { null }
                            )
                        ) { navController.popBackStack() }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                enabled = fullName.isNotBlank() && !isLoading,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Teal600)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                } else {
                    Text(if (isEditing) "Save Changes" else "Add Client", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

private fun buildUpdateBody(
    fullName: String, email: String, phone: String, address: String, city: String, state: String,
    zipCode: String, dateOfBirth: String, gender: String, careLevel: String, primaryDiagnosis: String,
    emergencyName: String, emergencyPhone: String, emergencyRelationship: String,
    insuranceProvider: String, insuranceId: String, medicaidId: String, medicareId: String,
    medicalConditions: String, medications: String, allergies: String, notes: String
): Map<String, Any?> = mapOf(
    "full_name" to fullName,
    "email" to email.ifBlank { null },
    "phone" to phone.ifBlank { null },
    "address" to address.ifBlank { null },
    "city" to city.ifBlank { null },
    "state" to state.ifBlank { null },
    "zip_code" to zipCode.ifBlank { null },
    "date_of_birth" to dateOfBirth.ifBlank { null },
    "gender" to gender.ifBlank { null },
    "care_level" to careLevel.ifBlank { null },
    "primary_diagnosis" to primaryDiagnosis.ifBlank { null },
    "emergency_contact_name" to emergencyName.ifBlank { null },
    "emergency_contact_phone" to emergencyPhone.ifBlank { null },
    "emergency_contact_relationship" to emergencyRelationship.ifBlank { null },
    "insurance_provider" to insuranceProvider.ifBlank { null },
    "insurance_id" to insuranceId.ifBlank { null },
    "medicaid_id" to medicaidId.ifBlank { null },
    "medicare_id" to medicareId.ifBlank { null },
    "medical_conditions" to medicalConditions.ifBlank { null },
    "medications" to medications.ifBlank { null },
    "allergies" to allergies.ifBlank { null },
    "notes" to notes.ifBlank { null }
)

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
