import SwiftUI
import AVFoundation

struct RecordView: View {
    @EnvironmentObject var api: APIService
    @StateObject private var recorder = AudioRecorderService()

    @State private var clients: [Client] = []
    @State private var selectedClient: Client?
    @State private var showClientPicker = false
    @State private var permissionGranted = false
    @State private var showPermissionAlert = false
    @State private var isUploading = false
    @State private var uploadSuccess = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var recordingFinishedURL: URL?
    @State private var uploadStatusMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                VStack(spacing: 2) {
                    Text("New Assessment")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.palmText)

                    Text("PALM IT — AI IS LISTENING")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.palmPrimary)
                        .tracking(1.2)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.white)
                .overlay(
                    Rectangle().fill(Color.palmBorder).frame(height: 1),
                    alignment: .bottom
                )

                VStack(spacing: 0) {
                    Button { showClientPicker = true } label: {
                        HStack {
                            HStack(spacing: 10) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Color.palmBackground)
                                        .frame(width: 30, height: 30)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(Color.palmBorder, style: StrokeStyle(lineWidth: 1.5, dash: [4]))
                                        )

                                    Image(systemName: "person")
                                        .font(.system(size: 14))
                                        .foregroundColor(.palmSecondary)
                                }

                                Text(selectedClient?.full_name ?? "Select a client")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(selectedClient != nil ? .palmText : .palmSecondary)
                            }

                            Spacer()

                            Image(systemName: "chevron.down")
                                .font(.system(size: 14))
                                .foregroundColor(.palmSecondary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 11)
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1.5))
                        .shadow(color: .black.opacity(0.04), radius: 3, y: 1)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 20)
                    .padding(.bottom, 28)

                    Text(timeString(recorder.duration))
                        .font(.system(size: 58, weight: .heavy, design: .default))
                        .foregroundColor(.palmText)
                        .tracking(-2)
                        .monospacedDigit()
                        .padding(.bottom, 4)

                    Text(statusText.uppercased())
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.palmSecondary)
                        .tracking(1.5)
                        .padding(.bottom, 36)

                    VStack(spacing: 13) {
                        ZStack {
                            Circle()
                                .fill(recorder.isRecording ? Color.red.opacity(0.05) : Color.palmPrimary.opacity(0.05))
                                .frame(width: 130, height: 130)
                                .overlay(
                                    Circle()
                                        .stroke(
                                            recorder.isRecording ? Color.red.opacity(0.15) : Color.palmPrimary.opacity(0.15),
                                            lineWidth: 1.5
                                        )
                                )
                                .scaleEffect(recorder.isRecording ? (1.0 + CGFloat(recorder.audioLevel) * 0.15) : 1.0)
                                .animation(.easeInOut(duration: 0.15), value: recorder.audioLevel)

                            Circle()
                                .fill(
                                    recorder.isRecording
                                        ? LinearGradient(colors: [.red, .red.opacity(0.85)], startPoint: .topLeading, endPoint: .bottomTrailing)
                                        : LinearGradient(colors: [Color.palmPrimary, Color.palmPrimaryDark], startPoint: .topLeading, endPoint: .bottomTrailing)
                                )
                                .frame(width: 82, height: 82)
                                .shadow(
                                    color: (recorder.isRecording ? Color.red : Color.palmPrimary).opacity(0.45),
                                    radius: 10, y: 3
                                )
                                .overlay(
                                    Group {
                                        if recorder.isRecording {
                                            RoundedRectangle(cornerRadius: 6)
                                                .fill(Color.white)
                                                .frame(width: 26, height: 26)
                                        } else {
                                            Image(systemName: "mic.fill")
                                                .font(.system(size: 32))
                                                .foregroundColor(.white)
                                        }
                                    }
                                )
                        }
                        .onTapGesture { handleRecordTap() }

                        Text(recorder.isRecording ? "Tap to stop recording" : "Tap to start · AI handles the rest")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                    }

                    Spacer()

                    if recordingFinishedURL != nil && !recorder.isRecording {
                        VStack(spacing: 12) {
                            if let statusMsg = uploadStatusMessage {
                                Text(statusMsg)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.palmPrimary)
                                    .padding(.bottom, 4)
                            }

                            Button { uploadRecording() } label: {
                                HStack(spacing: 8) {
                                    if isUploading {
                                        ProgressView().tint(.white)
                                    } else {
                                        Image(systemName: "arrow.up.circle.fill")
                                            .font(.system(size: 18))
                                    }
                                    Text(isUploading ? "Processing..." : "Upload & Process")
                                        .font(.system(size: 14, weight: .heavy))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                                .background(LinearGradient(colors: [Color.palmPrimary, Color.palmPrimaryDark], startPoint: .topLeading, endPoint: .bottomTrailing))
                                .cornerRadius(12)
                                .shadow(color: Color.palmPrimary.opacity(0.35), radius: 7, y: 3)
                            }
                            .disabled(isUploading || selectedClient == nil)
                            .opacity(selectedClient == nil ? 0.5 : 1)

                            if selectedClient == nil {
                                Text("Please select a client before uploading")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }

                            Button {
                                discardRecording()
                            } label: {
                                Text("Discard")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.red)
                            }
                        }
                        .padding(.horizontal, 18)
                        .padding(.bottom, 16)
                    }

                    Spacer().frame(height: 80)
                }
                .frame(maxWidth: .infinity)
            }
            .background(Color.palmBackground)
            .sheet(isPresented: $showClientPicker) {
                ClientPickerSheet(clients: clients, selected: $selectedClient)
            }
            .alert("Microphone Access", isPresented: $showPermissionAlert) {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("PalmCareAI needs microphone access to record visits. Please enable it in Settings.")
            }
            .alert("Upload Successful", isPresented: $uploadSuccess) {
                Button("OK") {
                    discardRecording()
                }
            } message: {
                Text("Your recording has been uploaded and the AI pipeline is processing it. Check the home screen for status updates.")
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage ?? "An error occurred.")
            }
            .task {
                await loadClients()
                permissionGranted = await recorder.requestPermission()
            }
        }
    }

    private var statusText: String {
        if recorder.isRecording {
            return "Recording... Tap to stop"
        } else if isUploading {
            return "Uploading & processing"
        } else if recordingFinishedURL != nil {
            return "Recording complete"
        } else {
            return "Ready to Palm It"
        }
    }

    private func handleRecordTap() {
        if recorder.isRecording {
            recordingFinishedURL = recorder.stopRecording()
        } else {
            if !permissionGranted {
                permissionGranted = recorder.checkPermissionStatus()
            }
            guard permissionGranted else {
                showPermissionAlert = true
                return
            }
            recordingFinishedURL = nil
            uploadStatusMessage = nil
            do {
                try recorder.startRecording()
            } catch {
                errorMessage = "Failed to start recording: \(error.localizedDescription)"
                showError = true
            }
        }
    }

    private func uploadRecording() {
        guard let url = recordingFinishedURL,
              let clientId = selectedClient?.id
        else { return }

        isUploading = true
        uploadStatusMessage = "Creating visit..."

        Task {
            do {
                let visit = try await api.createVisit(clientId: clientId)

                await MainActor.run {
                    uploadStatusMessage = "Uploading audio..."
                }

                let data = try Data(contentsOf: url)
                let filename = url.lastPathComponent
                _ = try await api.uploadAudio(visitId: visit.id, audioData: data, filename: filename, autoProcess: true)

                await MainActor.run {
                    isUploading = false
                    uploadStatusMessage = nil
                    uploadSuccess = true
                }
            } catch {
                await MainActor.run {
                    isUploading = false
                    uploadStatusMessage = nil
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }

    private func discardRecording() {
        if let url = recordingFinishedURL {
            try? FileManager.default.removeItem(at: url)
        }
        recordingFinishedURL = nil
        recorder.recordingURL = nil
        uploadStatusMessage = nil
    }

    private func loadClients() async {
        do {
            let fetched = try await api.fetchClients()
            await MainActor.run { clients = fetched }
        } catch {
            print("Failed to load clients: \(error.localizedDescription)")
        }
    }

    private func timeString(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// MARK: - Client Picker Sheet

struct ClientPickerSheet: View {
    let clients: [Client]
    @Binding var selected: Client?
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    var filtered: [Client] {
        if search.isEmpty { return clients }
        return clients.filter { $0.full_name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            List(filtered) { client in
                Button {
                    selected = client
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(client.full_name)
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.palmText)

                            if let diagnosis = client.primary_diagnosis, !diagnosis.isEmpty {
                                Text(diagnosis)
                                    .font(.caption)
                                    .foregroundColor(.palmSecondary)
                            }

                            if let phone = client.phone {
                                Text(phone)
                                    .font(.caption)
                                    .foregroundColor(.palmSecondary)
                            }
                        }

                        Spacer()

                        if selected?.id == client.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.palmPrimary)
                        }
                    }
                }
            }
            .searchable(text: $search, prompt: "Search clients")
            .navigationTitle("Select Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    RecordView()
        .environmentObject(APIService.shared)
}
