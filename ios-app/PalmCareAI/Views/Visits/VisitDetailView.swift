import SwiftUI

struct VisitDetailView: View {
    @EnvironmentObject var api: APIService
    let visitId: String
    var clientName: String?
    /// Index into `fullTabs` (legacy). Prefer resolving via `visibleTabs` after load.
    var initialTab: Int = 0

    struct TabDef: Identifiable, Equatable {
        let id: String
        let title: String
        let icon: String
    }

    /// Fixed catalog. `visibleTabs` drops Billables when the visit has none.
    static let fullTabs: [TabDef] = [
        TabDef(id: "overview", title: "Overview", icon: "chart.bar.fill"),
        TabDef(id: "transcript", title: "Transcript", icon: "text.quote"),
        TabDef(id: "billables", title: "Billables", icon: "dollarsign.circle.fill"),
        TabDef(id: "notes", title: "Notes", icon: "note.text"),
        TabDef(id: "care_plan", title: "Care Plan", icon: "list.clipboard.fill"),
        TabDef(id: "contract", title: "Contract", icon: "doc.text.fill"),
    ]

    @State var visit: Visit?
    @State var transcript: VisitTranscriptResponse?
    @State var billables: VisitBillablesResponse?
    @State var note: VisitNote?
    @State var contract: VisitContract?
    @State var carePlanText: String?

    @State var tabFetchFailed: Set<String> = []

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
    @State var editingBillableId: String?
    @State var editBillableDescription = ""
    @State var editBillableMinutes = ""
    @State var isSavingBillableEdit = false
    @State var isEditingNote = false
    @State var editNoteSubjective = ""
    @State var editNoteObjective = ""
    @State var editNoteAssessment = ""
    @State var editNotePlan = ""
    @State var editNoteNarrative = ""
    @State var isSavingNote = false
    @State var isEditingContract = false
    @State var editContractTitle = ""
    @State var editContractTerms = ""
    @State var editContractRate = ""
    @State var editContractHours = ""
    @State var isSavingContract = false
    @State var showFullContract = false
    @State var selectedContractStyle = "modern"
    @State var showEmailSheet = false
    /// Pipeline step key currently being re-queued (bill / note / contract / …).
    @State var retryingPipelineStep: String?
    #if DEBUG
    @State var didRunAutomationTabCycle = false
    #endif

    /// Tabs shown for this visit. Billables drops out once billing finished with zero items.
    var visibleTabs: [TabDef] {
        Self.fullTabs.filter { $0.id != "billables" || shouldShowBillablesTab }
    }

    /// True when this assessment has billable line items, or billing is still
    /// in flight / failed (so the user can watch or retry). False when billing
    /// completed with an empty list — contract rates do not require billables.
    var shouldShowBillablesTab: Bool {
        if !(billables?.items ?? []).isEmpty { return true }
        guard let v = visit else { return true }
        let state = pipelineStepState(v, step: "billing")
        if state.isProcessing || state.isFailed || state.isStuck { return true }
        if state.isComplete {
            if let count = billingItemCountFromPipeline(v) { return count > 0 }
            if billables != nil { return false }
            return false
        }
        return true
    }

    var hasBillableItems: Bool {
        !(billables?.items ?? []).isEmpty
    }

    var activeTabId: String {
        let tabs = visibleTabs
        guard tabs.indices.contains(activeTab) else { return "overview" }
        return tabs[activeTab].id
    }

    var body: some View {
        VStack(spacing: 0) {
            tabBar
            tabContent
        }
        .background(PalmGlassBackground())
        .navigationTitle(clientName ?? "Assessment")
        .navigationBarTitleDisplayMode(.inline)
        .palmTransparentNavBar()
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
                    Button { Task { await exportFile(type: "care-plan.pdf") } } label: {
                        Label("Export Care Plan (PDF)", systemImage: "list.clipboard")
                    }
                    .disabled(!hasCarePlanContent)
                    .accessibilityLabel("Export care plan as PDF")
                    Button { Task { await exportFile(type: "contract.pdf") } } label: {
                        Label("Export Contract (PDF)", systemImage: "doc.fill")
                    }
                    .disabled(contract == nil)
                    .accessibilityLabel("Export contract as PDF")
                    Button { Task { await exportFile(type: "timesheet.csv") } } label: {
                        Label("Export Timesheet (CSV)", systemImage: "tablecells")
                    }
                    .disabled(!hasBillableItems)
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
            PostHogService.shared.capture("visit_detail_opened")
            await loadVisit()
            applyInitialTab()
            await pollPipelineUntilComplete()
        }
        .onChange(of: activeTab) { _ in
            PostHogService.shared.capture("visit_detail_tab_viewed", properties: [
                "tab_index": activeTab,
                "tab_name": activeTabId,
            ])
            Task { await loadTabDataIfNeeded() }
        }
        .onChange(of: hasBillableItems) { _ in
            clampActiveTabToVisible()
        }
        .onChange(of: shouldShowBillablesTab) { _ in
            clampActiveTabToVisible()
        }
        #if DEBUG
        .task {
            if ProcessInfo.processInfo.arguments.contains("AUTOMATION_STRESS_FLOW") {
                guard !didRunAutomationTabCycle else { return }
                didRunAutomationTabCycle = true
                for tabId in ["transcript", "billables", "notes", "care_plan", "contract", "overview"] {
                    try? await Task.sleep(nanoseconds: 1_500_000_000)
                    await MainActor.run { selectTab(id: tabId) }
                }
                return
            }
            guard ProcessInfo.processInfo.arguments.contains("MARKETING_FULL_PIPELINE") else { return }
            guard !didRunAutomationTabCycle else { return }
            didRunAutomationTabCycle = true
            // Stay on overview while the processing banner fills in.
            for _ in 0..<40 {
                if !isPipelineProcessing, contract != nil { break }
                try? await Task.sleep(nanoseconds: 3_000_000_000)
            }
            // Walk the finished packet, ending on Contract.
            for tabId in ["transcript", "notes", "care_plan", "contract"] {
                try? await Task.sleep(nanoseconds: 2_500_000_000)
                await MainActor.run { selectTab(id: tabId) }
            }
            // Linger on Contract for the marketing end card.
            try? await Task.sleep(nanoseconds: 8_000_000_000)
        }
        #endif
    }

    // MARK: - Tab Bar

    /// Frosted glass segmented pills floating over the mint wash — the active
    /// pill is a teal gradient chip, inactive pills are translucent white glass.
    var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(visibleTabs.enumerated()), id: \.element.id) { index, tab in
                    let isActive = activeTab == index
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { activeTab = index }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: tab.icon)
                                .font(.system(size: 11, weight: .semibold))
                            Text(tab.title)
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundColor(isActive ? .white : .palmSecondary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background {
                            if isActive {
                                Capsule(style: .continuous)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.palmPrimary, Color.palmTeal600],
                                            startPoint: .leading, endPoint: .trailing
                                        )
                                    )
                                    .shadow(color: PalmGlass.tealShadow, radius: 8, y: 3)
                            } else {
                                Capsule(style: .continuous)
                                    .fill(Color.white.opacity(0.55))
                                    .overlay(
                                        Capsule(style: .continuous)
                                            .stroke(Color.palmGlassBorder, lineWidth: 1)
                                    )
                            }
                        }
                    }
                    .accessibilityLabel("\(tab.title) tab")
                    .accessibilityAddTraits(isActive ? .isSelected : [])
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
        }
    }

    // MARK: - Screen Header (Pipeline Glass eyebrow + title)

    var screenTitle: String {
        visibleTabs.indices.contains(activeTab) ? visibleTabs[activeTab].title : "Assessment"
    }

    /// Client-name eyebrow + large screen title, matching Paper Pipeline Glass
    /// (e.g. "Eleanor" / "Care Plan" — sentence case muted, 34pt bold title).
    var screenHeader: some View {
        let ink = Color(red: 16 / 255, green: 33 / 255, blue: 31 / 255)
        let muted = Color(red: 75 / 255, green: 107 / 255, blue: 102 / 255)
        let firstName: String = {
            let full = clientName ?? visit?.client?.full_name ?? ""
            return full.split(separator: " ").first.map(String.init) ?? full
        }()

        return VStack(alignment: .leading, spacing: 4) {
            if !firstName.isEmpty {
                Text(firstName)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(muted)
                    .lineLimit(1)
            }
            Text(screenTitle)
                .font(.system(size: 34, weight: .bold))
                .foregroundColor(ink)
                .tracking(-1.4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 4)
        .padding(.bottom, 8)
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
                    screenHeader
                    // Pipeline progress lives on Record → Processing (Paper),
                    // and on Overview → Documents. Do not repeat an "X of N
                    // ready" banner on Transcript / Notes / Contract tabs.
                    switch activeTabId {
                    case "overview": overviewTab
                    case "transcript": transcriptTab
                    case "billables": billablesTab
                    case "notes": notesTab
                    case "care_plan": carePlanTab
                    case "contract": contractTab
                    default: EmptyView()
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
            .padding(.bottom, 80)
        }
    }

    func selectTab(id: String) {
        if let idx = visibleTabs.firstIndex(where: { $0.id == id }) {
            activeTab = idx
        }
    }

    func applyInitialTab() {
        guard initialTab != 0, initialTab < Self.fullTabs.count else { return }
        selectTab(id: Self.fullTabs[initialTab].id)
    }

    func clampActiveTabToVisible() {
        if activeTab >= visibleTabs.count {
            activeTab = max(0, visibleTabs.count - 1)
        }
    }

    func billingItemCountFromPipeline(_ v: Visit) -> Int? {
        guard let ps = v.pipeline_state,
              let step = ps["billing"]?.value as? [String: Any] else { return nil }
        if let count = step["item_count"] as? Int { return count }
        if let count = step["item_count"] as? Double { return Int(count) }
        return nil
    }

}
