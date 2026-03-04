import SwiftUI
import UniformTypeIdentifiers

struct TemplatesView: View {
    @EnvironmentObject var api: APIService

    @State private var templates: [ContractTemplateItem] = []
    @State private var isLoading = true
    @State private var showUploadSheet = false
    @State private var errorMessage: String?
    @State private var deletingId: String?

    var body: some View {
        VStack(spacing: 0) {
            headerInfo

            if let msg = errorMessage {
                errorBanner(msg)
            }

            Group {
                if isLoading {
                    VStack { Spacer(); ProgressView("Loading templates..."); Spacer() }
                } else if templates.isEmpty {
                    emptyState
                } else {
                    templateList
                }
            }
        }
        .background(Color.palmBackground)
        .task { await loadTemplates() }
        .sheet(isPresented: $showUploadSheet) {
            UploadTemplateSheet { await loadTemplates() }
                .environmentObject(api)
        }
        .overlay(alignment: .bottomTrailing) {
            Button { showUploadSheet = true } label: {
                Image(systemName: "plus")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 48, height: 48)
                    .background(
                        LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                                       startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .cornerRadius(14)
                    .shadow(color: Color.palmPrimary.opacity(0.4), radius: 8, y: 4)
            }
            .accessibilityLabel("Upload new template")
            .padding(.trailing, 18)
            .padding(.bottom, 100)
        }
    }

    // MARK: - Header

    private var headerInfo: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Image(systemName: "doc.badge.gearshape")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmPrimary)
                Text("Contract Templates")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.palmText)
            }

            Text("Upload your contract templates (PDF or DOCX). They'll be OCR-scanned and auto-filled with client data every time you complete an assessment.")
                .font(.system(size: 12))
                .foregroundColor(.palmSecondary)
                .lineSpacing(2)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
    }

    // MARK: - Template List

    private var templateList: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 8) {
                ForEach(templates) { template in
                    TemplateRow(
                        template: template,
                        isDeleting: deletingId == template.id,
                        onDelete: { await deleteTemplate(template) },
                        onRescan: { await rescanTemplate(template) }
                    )
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
            .padding(.bottom, 120)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.palmPrimary.opacity(0.08))
                    .frame(width: 80, height: 80)
                Image(systemName: "doc.badge.plus")
                    .font(.system(size: 34))
                    .foregroundColor(.palmPrimary.opacity(0.5))
            }

            Text("No Templates Yet")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.palmText)

            Text("Upload a contract template and it will be automatically filled with client data after each assessment.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button { showUploadSheet = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.up.doc.fill")
                        .font(.system(size: 13, weight: .semibold))
                    Text("Upload Template")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                                           startPoint: .leading, endPoint: .trailing))
                .cornerRadius(12)
                .shadow(color: Color.palmPrimary.opacity(0.3), radius: 6, y: 3)
            }
            .accessibilityLabel("Upload template")

            Spacer()
        }
    }

    // MARK: - Error Banner

    private func errorBanner(_ msg: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 11))
            Text(msg)
                .font(.system(size: 12))
            Spacer()
            Button { errorMessage = nil } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
            }
        }
        .foregroundColor(.red)
        .padding(.horizontal, 18)
        .padding(.vertical, 8)
        .background(Color.red.opacity(0.06))
    }

    // MARK: - Actions

    private func loadTemplates() async {
        do {
            let result = try await api.fetchTemplates()
            await MainActor.run {
                templates = result
                isLoading = false
            }
        } catch {
            await MainActor.run {
                errorMessage = "Failed to load templates"
                isLoading = false
            }
        }
    }

    private func deleteTemplate(_ template: ContractTemplateItem) async {
        await MainActor.run { deletingId = template.id }
        do {
            try await api.deleteTemplate(id: template.id)
            await MainActor.run {
                templates.removeAll { $0.id == template.id }
                deletingId = nil
            }
        } catch {
            await MainActor.run {
                errorMessage = "Delete failed: \(error.localizedDescription)"
                deletingId = nil
            }
        }
    }

    private func rescanTemplate(_ template: ContractTemplateItem) async {
        do {
            _ = try await api.rescanTemplate(id: template.id)
            await loadTemplates()
        } catch {
            await MainActor.run {
                errorMessage = "Re-scan failed: \(error.localizedDescription)"
            }
        }
    }
}

// MARK: - Template Row

struct TemplateRow: View {
    let template: ContractTemplateItem
    let isDeleting: Bool
    let onDelete: () async -> Void
    let onRescan: () async -> Void

    @State private var showActions = false
    @State private var isRescanning = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.palmPrimary.opacity(0.1))
                        .frame(width: 42, height: 42)
                    Image(systemName: template.file_type == "pdf" ? "doc.richtext.fill" : "doc.text.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.palmPrimary)
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(template.name)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.palmText)
                            .lineLimit(1)

                        if template.is_active {
                            Text("ACTIVE")
                                .font(.system(size: 8, weight: .heavy))
                                .foregroundColor(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Color.green)
                                .cornerRadius(3)
                        }
                    }

                    HStack(spacing: 8) {
                        Label("v\(template.version)", systemImage: "tag")
                        Label(template.file_type.uppercased(), systemImage: "doc")
                        Label("\(template.field_count) fields", systemImage: "list.bullet")
                    }
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.palmSecondary)
                }

                Spacer()

                Button { showActions.toggle() } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.palmSecondary)
                        .frame(width: 32, height: 32)
                }
                .accessibilityLabel("Template actions for \(template.name)")
            }

            if template.unmapped_count > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 10))
                    Text("\(template.unmapped_count) unmapped field\(template.unmapped_count == 1 ? "" : "s") — map them on the web app for best results")
                        .font(.system(size: 11))
                }
                .foregroundColor(.orange)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color.orange.opacity(0.06))
                .cornerRadius(6)
            }

            if showActions {
                HStack(spacing: 10) {
                    Button {
                        isRescanning = true
                        Task {
                            await onRescan()
                            isRescanning = false
                        }
                    } label: {
                        HStack(spacing: 4) {
                            if isRescanning {
                                ProgressView().controlSize(.mini)
                            } else {
                                Image(systemName: "arrow.clockwise")
                            }
                            Text("Re-scan OCR")
                        }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.palmPrimary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Color.palmPrimary.opacity(0.08))
                        .cornerRadius(8)
                    }
                    .accessibilityLabel("Re-scan template")
                    .disabled(isRescanning)

                    Spacer()

                    Button {
                        Task { await onDelete() }
                    } label: {
                        HStack(spacing: 4) {
                            if isDeleting {
                                ProgressView().controlSize(.mini)
                            } else {
                                Image(systemName: "trash")
                            }
                            Text("Delete")
                        }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.red)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Color.red.opacity(0.06))
                        .cornerRadius(8)
                    }
                    .accessibilityLabel("Delete template")
                    .disabled(isDeleting)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(template.is_active ? Color.palmPrimary.opacity(0.3) : Color.palmBorder, lineWidth: 1)
        )
        .animation(.easeInOut(duration: 0.2), value: showActions)
    }
}

// MARK: - Upload Template Sheet

struct UploadTemplateSheet: View {
    @EnvironmentObject var api: APIService
    @Environment(\.dismiss) private var dismiss

    let onComplete: () async -> Void

    @State private var templateName = ""
    @State private var templateDescription = ""
    @State private var selectedFileURL: URL?
    @State private var selectedFileName = ""
    @State private var showFilePicker = false
    @State private var isUploading = false
    @State private var uploadProgress = ""
    @State private var errorMessage: String?
    @State private var uploadSuccess = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerIcon

                    VStack(spacing: 16) {
                        formField(label: "Template Name", required: true) {
                            TextField("e.g. Home Care Service Agreement", text: $templateName)
                                .font(.system(size: 14))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                        }

                        formField(label: "Description") {
                            TextField("Optional description", text: $templateDescription)
                                .font(.system(size: 14))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                        }

                        formField(label: "Contract File", required: true) {
                            Button { showFilePicker = true } label: {
                                HStack(spacing: 10) {
                                    Image(systemName: selectedFileURL != nil ? "doc.fill" : "arrow.up.doc")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(selectedFileURL != nil ? .palmPrimary : .palmSecondary)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(selectedFileURL != nil ? selectedFileName : "Choose PDF or DOCX file")
                                            .font(.system(size: 13, weight: .medium))
                                            .foregroundColor(selectedFileURL != nil ? .palmText : .palmSecondary)
                                        Text("Max 20MB · PDF or DOCX")
                                            .font(.system(size: 10))
                                            .foregroundColor(.palmSecondary)
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(.palmBorder)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 12)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(selectedFileURL != nil ? Color.palmPrimary.opacity(0.4) : Color.palmBorder, lineWidth: 1)
                                )
                            }
                            .accessibilityLabel("Choose file")
                        }
                    }
                    .padding(.horizontal, 20)

                    if let err = errorMessage {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 11))
                            Text(err)
                                .font(.system(size: 12))
                        }
                        .foregroundColor(.red)
                        .padding(.horizontal, 20)
                    }

                    if uploadSuccess {
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 14))
                            Text("Template uploaded and scanned successfully!")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundColor(.green)
                        .padding(.horizontal, 20)
                    }

                    uploadButton
                        .padding(.horizontal, 20)
                        .padding(.bottom, 30)
                }
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("Upload Template")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.palmSecondary)
                        .accessibilityLabel("Cancel upload")
                }
            }
            .sheet(isPresented: $showFilePicker) {
                TemplateFilePicker { url in
                    selectedFileURL = url
                    selectedFileName = url.lastPathComponent
                }
            }
        }
    }

    private var headerIcon: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(colors: [Color.palmPrimary.opacity(0.15), Color.palmTeal600.opacity(0.1)],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .frame(width: 64, height: 64)
            Image(systemName: "doc.badge.gearshape.fill")
                .font(.system(size: 28))
                .foregroundColor(.palmPrimary)
        }
    }

    private var uploadButton: some View {
        Button { performUpload() } label: {
            HStack(spacing: 8) {
                if isUploading {
                    ProgressView().tint(.white)
                    Text(uploadProgress.isEmpty ? "Uploading..." : uploadProgress)
                } else {
                    Image(systemName: "arrow.up.doc.fill")
                    Text("Upload & Scan")
                }
            }
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(colors: canUpload ? [Color.palmPrimary, Color.palmTeal600] : [Color.gray.opacity(0.4), Color.gray.opacity(0.3)],
                               startPoint: .leading, endPoint: .trailing)
            )
            .cornerRadius(12)
            .shadow(color: canUpload ? Color.palmPrimary.opacity(0.3) : .clear, radius: 6, y: 3)
        }
        .disabled(!canUpload || isUploading)
    }

    private var canUpload: Bool {
        !templateName.trimmingCharacters(in: .whitespaces).isEmpty && selectedFileURL != nil
    }

    private func performUpload() {
        guard let fileURL = selectedFileURL else { return }
        isUploading = true
        errorMessage = nil
        uploadSuccess = false
        uploadProgress = "Reading file..."

        Task {
            do {
                guard fileURL.startAccessingSecurityScopedResource() else {
                    throw APIError.serverError("Cannot access the selected file")
                }
                defer { fileURL.stopAccessingSecurityScopedResource() }

                let fileData = try Data(contentsOf: fileURL)
                let filename = fileURL.lastPathComponent

                await MainActor.run { uploadProgress = "Uploading & scanning..." }

                let result = try await api.uploadTemplate(
                    fileData: fileData,
                    filename: filename,
                    name: templateName.trimmingCharacters(in: .whitespaces),
                    description: templateDescription.isEmpty ? nil : templateDescription
                )

                let fieldCount = result.detected_fields?.count ?? 0
                _ = result.unmapped_fields?.count ?? 0

                await MainActor.run {
                    isUploading = false
                    uploadSuccess = true
                    uploadProgress = ""
                    if fieldCount > 0 {
                        errorMessage = nil
                    }
                }

                await onComplete()

                try? await Task.sleep(nanoseconds: 1_500_000_000)
                await MainActor.run { dismiss() }

            } catch {
                await MainActor.run {
                    isUploading = false
                    uploadProgress = ""
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func formField<Content: View>(label: String, required: Bool = false, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.palmTextMuted)
                if required {
                    Text("*")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.red)
                }
            }
            content()
        }
    }
}

// MARK: - File Picker

struct TemplateFilePicker: UIViewControllerRepresentable {
    let onPick: (URL) -> Void

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let types: [UTType] = [.pdf, UTType("org.openxmlformats.wordprocessingml.document") ?? .data]
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
        picker.delegate = context.coordinator
        picker.allowsMultipleSelection = false
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onPick: onPick) }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onPick: (URL) -> Void
        init(onPick: @escaping (URL) -> Void) { self.onPick = onPick }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            if let url = urls.first { onPick(url) }
        }
    }
}
