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

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Client picker
                Button {
                    showClientPicker = true
                } label: {
                    HStack {
                        Image(systemName: "person.circle")
                            .font(.system(size: 20))
                            .foregroundColor(.palmPrimary)

                        Text(selectedClient?.full_name ?? "Select a client")
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(selectedClient != nil ? .palmText : .palmSecondary)

                        Spacer()

                        Image(systemName: "chevron.down")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.palmSecondary)
                    }
                    .padding(16)
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                Spacer()

                // Recording area
                VStack(spacing: 32) {
                    // Timer
                    Text(timeString(recorder.duration))
                        .font(.system(size: 48, weight: .light, design: .monospaced))
                        .foregroundColor(.palmText)

                    // Waveform animation
                    if recorder.isRecording {
                        WaveformView()
                            .frame(height: 60)
                            .padding(.horizontal, 40)
                    } else if recordingFinishedURL != nil {
                        HStack(spacing: 4) {
                            ForEach(0..<20, id: \.self) { _ in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(Color.palmTeal.opacity(0.4))
                                    .frame(width: 4, height: CGFloat.random(in: 8...30))
                            }
                        }
                        .frame(height: 60)
                        .padding(.horizontal, 40)
                    } else {
                        Rectangle()
                            .fill(Color.clear)
                            .frame(height: 60)
                    }

                    // Record button
                    ZStack {
                        // Pulsing ring when recording
                        if recorder.isRecording {
                            Circle()
                                .stroke(Color.palmTeal.opacity(0.3), lineWidth: 3)
                                .frame(width: 110, height: 110)
                                .scaleEffect(recorder.isRecording ? 1.2 : 1.0)
                                .opacity(recorder.isRecording ? 0.0 : 1.0)
                                .animation(
                                    .easeInOut(duration: 1.5).repeatForever(autoreverses: false),
                                    value: recorder.isRecording
                                )
                        }

                        Circle()
                            .fill(recorder.isRecording ? Color.red : Color.palmPrimary)
                            .frame(width: 88, height: 88)
                            .shadow(
                                color: (recorder.isRecording ? Color.red : Color.palmPrimary).opacity(0.4),
                                radius: 12, y: 4
                            )

                        if recorder.isRecording {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.white)
                                .frame(width: 28, height: 28)
                        } else {
                            Image(systemName: "mic.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.white)
                        }
                    }
                    .onTapGesture {
                        handleRecordTap()
                    }

                    // Status text
                    Text(statusText)
                        .font(.subheadline)
                        .foregroundColor(.palmSecondary)
                }

                Spacer()

                // Upload button (shown after recording)
                if recordingFinishedURL != nil && !recorder.isRecording {
                    VStack(spacing: 12) {
                        Button {
                            uploadRecording()
                        } label: {
                            HStack(spacing: 8) {
                                if isUploading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Image(systemName: "arrow.up.circle.fill")
                                        .font(.system(size: 20))
                                }
                                Text(isUploading ? "Uploading..." : "Upload Recording")
                                    .font(.body.weight(.semibold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(LinearGradient.palmPrimary)
                            .cornerRadius(12)
                        }
                        .disabled(isUploading || selectedClient == nil)
                        .opacity(selectedClient == nil ? 0.5 : 1)

                        if selectedClient == nil {
                            Text("Please select a client before uploading")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }

                        Button {
                            recordingFinishedURL = nil
                            recorder.recordingURL = nil
                        } label: {
                            Text("Discard")
                                .font(.subheadline.weight(.medium))
                                .foregroundColor(.red)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }

                Spacer().frame(height: 100)
            }
            .background(Color.palmBackground)
            .navigationTitle("Record")
            .navigationBarTitleDisplayMode(.inline)
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
                    recordingFinishedURL = nil
                    recorder.recordingURL = nil
                }
            } message: {
                Text("Your recording has been uploaded and is being processed.")
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
        } else if recordingFinishedURL != nil {
            return "Recording complete"
        } else {
            return "Tap to start recording"
        }
    }

    private func handleRecordTap() {
        if recorder.isRecording {
            recordingFinishedURL = recorder.stopRecording()
        } else {
            guard permissionGranted else {
                showPermissionAlert = true
                return
            }
            recordingFinishedURL = nil
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
        Task {
            do {
                let data = try Data(contentsOf: url)
                let filename = url.lastPathComponent
                _ = try await api.uploadAudio(clientId: clientId, audioData: data, filename: filename)
                await MainActor.run {
                    isUploading = false
                    uploadSuccess = true
                }
            } catch {
                await MainActor.run {
                    isUploading = false
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }

    private func loadClients() async {
        do {
            let fetched = try await api.fetchClients()
            await MainActor.run { clients = fetched }
        } catch {
            // Silently fail; user can retry
        }
    }

    private func timeString(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

// MARK: - Waveform Animation

struct WaveformView: View {
    @State private var animating = false

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<24, id: \.self) { index in
                WaveformBar(delay: Double(index) * 0.05, animating: animating)
            }
        }
        .onAppear { animating = true }
        .onDisappear { animating = false }
    }
}

struct WaveformBar: View {
    let delay: Double
    let animating: Bool

    @State private var height: CGFloat = 8

    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(Color.palmTeal)
            .frame(width: 4, height: height)
            .onAppear {
                withAnimation(
                    .easeInOut(duration: 0.4)
                    .repeatForever(autoreverses: true)
                    .delay(delay)
                ) {
                    height = CGFloat.random(in: 12...50)
                }
            }
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
