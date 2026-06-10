import SwiftUI

struct VisitDetailView: View {
    @EnvironmentObject var api: APIService
    let visitId: String
    var clientName: String?
    var initialTab: Int = 0

    @State var visit: Visit?
    @State var transcript: VisitTranscriptResponse?
    @State var billables: VisitBillablesResponse?
    @State var note: VisitNote?
    @State var contract: VisitContract?

    @State var tabFetchFailed: Set<Int> = []

    @State var isLoading = true
    @State var activeTab = 0
    /// Initial visit-load failure only — drives the full-screen error state.
    @State var errorMessage: String?
    /// Transient action failures (export, restart) — shown as an alert so the
    /// user doesn't lose the tabs they already loaded.
    @State var actionError: String?
    @State var showActionError = false
    @State var isRefreshing = false
    /// Billable IDs with an approve/deny request in flight (double-tap guard).
    @State var pendingBillableIds: Set<String> = []
    @State var showFullContract = false
    @State var selectedContractStyle = "modern"
    @State var showStylePicker = false
    @State var showEmailSheet = false
    #if DEBUG
    @State var didRunAutomationTabCycle = false
    #endif

    let tabs = ["Overview", "Transcript", "Billables", "Notes", "Contract"]

    var body: some View {
        VStack(spacing: 0) {
            tabBar
            tabContent
        }
        .background(Color.palmBackground)
        .navigationTitle(clientName ?? "Assessment")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button { showEmailSheet = true } label: {
                        Label("Email Agreement", systemImage: "paperplane.fill")
                    }
                    // No contract yet (pipeline still running or failed) —
                    // there's nothing to attach, so don't offer the send.
                    .disabled(contract == nil)
                    .accessibilityLabel("Email service agreement")
                    Divider()
                    // Each export is gated on its data existing, otherwise the
                    // server 404s and the user just sees a confusing failure.
                    Button { Task { await exportFile(type: "note.pdf") } } label: {
                        Label("Export Notes (PDF)", systemImage: "doc.text")
                    }
                    .disabled(note == nil)
                    .accessibilityLabel("Export notes as PDF")
                    Button { Task { await exportFile(type: "contract.pdf") } } label: {
                        Label("Export Contract (PDF)", systemImage: "doc.fill")
                    }
                    .disabled(contract == nil)
                    .accessibilityLabel("Export contract as PDF")
                    Button { Task { await exportFile(type: "timesheet.csv") } } label: {
                        Label("Export Timesheet (CSV)", systemImage: "tablecells")
                    }
                    .disabled(visit == nil)
                    .accessibilityLabel("Export timesheet as CSV")
                    Divider()
                    Button(role: .destructive) { Task { await restartAssessment() } } label: {
                        Label("Restart Assessment", systemImage: "arrow.counterclockwise")
                    }
                    .accessibilityLabel("Restart assessment")
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.palmPrimary)
                }
                .accessibilityLabel("Assessment actions")
            }
        }
        .sheet(isPresented: $showEmailSheet) {
            EmailContractSheet(visitId: visitId, clientName: clientName, contractTitle: contract?.title)
                .environmentObject(api)
        }
        .palmErrorAlert(message: $actionError, isPresented: $showActionError)
        .task {
            if initialTab != 0 { activeTab = initialTab }
            await loadVisit()
            await pollPipelineUntilComplete()
        }
        .onChange(of: activeTab) { _ in
            Task { await loadTabDataIfNeeded() }
        }
        #if DEBUG
        .task {
            guard ProcessInfo.processInfo.arguments.contains("AUTOMATION_STRESS_FLOW") else { return }
            guard !didRunAutomationTabCycle else { return }
            didRunAutomationTabCycle = true
            for tabIndex in [1, 2, 3, 4, 0] {
                try? await Task.sleep(nanoseconds: 1_500_000_000)
                await MainActor.run { activeTab = tabIndex }
            }
        }
        #endif
    }

    // MARK: - Tab Bar

    var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { activeTab = index }
                } label: {
                    VStack(spacing: 6) {
                        HStack(spacing: 4) {
                            Image(systemName: tabIcon(index))
                                .font(.system(size: 10, weight: .semibold))
                            Text(tab)
                                .font(.system(size: 11, weight: .medium))
                        }
                        .foregroundColor(activeTab == index ? .palmPrimary : .palmSecondary)

                        Rectangle()
                            .fill(activeTab == index ? Color.palmPrimary : Color.clear)
                            .frame(height: 2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 10)
                }
                .accessibilityLabel("\(tab) tab")
            }
        }
        .padding(.horizontal, 4)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .overlay(Divider(), alignment: .bottom)
    }

    func tabIcon(_ index: Int) -> String {
        switch index {
        case 0: return "chart.bar.fill"
        case 1: return "text.quote"
        case 2: return "dollarsign.circle.fill"
        case 3: return "note.text"
        case 4: return "doc.text.fill"
        default: return "circle"
        }
    }

    // MARK: - Tab Content

    var tabContent: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                if isLoading {
                    loadingView
                } else if let error = errorMessage {
                    errorView(error)
                } else {
                    if isPipelineProcessing {
                        processingBanner
                    }
                    switch activeTab {
                    case 0: overviewTab
                    case 1: transcriptTab
                    case 2: billablesTab
                    case 3: notesTab
                    case 4: contractTab
                    default: EmptyView()
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .padding(.bottom, 80)
        }
    }

    /// Shown while the AI pipeline is still running so the user understands
    /// that empty tabs are filling in (not broken).
    var processingBanner: some View {
        HStack(spacing: 10) {
            ProgressView()
                .scaleEffect(0.8)
                .tint(.palmPrimary)
            VStack(alignment: .leading, spacing: 2) {
                Text("Processing assessment…")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmText)
                Text("Transcript, billables, notes, and contract will appear here automatically.")
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
            }
            Spacer()
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.palmPrimary.opacity(0.08))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmPrimary.opacity(0.2), lineWidth: 1))
    }

}
