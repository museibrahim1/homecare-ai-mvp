import SwiftUI

struct VisitDetailView: View {
    @EnvironmentObject var api: APIService
    let visitId: String
    var clientName: String?
    var initialTab: Int = 0

    @State private var visit: Visit?
    @State private var transcript: VisitTranscriptResponse?
    @State private var billables: VisitBillablesResponse?
    @State private var note: VisitNote?
    @State private var contract: VisitContract?

    @State private var tabFetchFailed: Set<Int> = []

    @State private var isLoading = true
    @State private var activeTab = 0
    @State private var errorMessage: String?
    @State private var isRefreshing = false
    @State private var showFullContract = false
    @State private var selectedContractStyle = "modern"
    @State private var showStylePicker = false

    private let tabs = ["Overview", "Transcript", "Billables", "Notes", "Contract"]

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
                    Button { Task { await exportFile(type: "note.pdf") } } label: {
                        Label("Export Notes (PDF)", systemImage: "doc.text")
                    }
                    .accessibilityLabel("Export notes as PDF")
                    Button { Task { await exportFile(type: "contract.pdf") } } label: {
                        Label("Export Contract (PDF)", systemImage: "doc.fill")
                    }
                    .accessibilityLabel("Export contract as PDF")
                    Button { Task { await exportFile(type: "timesheet.csv") } } label: {
                        Label("Export Timesheet (CSV)", systemImage: "tablecells")
                    }
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
        .task {
            if initialTab != 0 { activeTab = initialTab }
            await loadVisit()
        }
        .onChange(of: activeTab) { _ in
            Task { await loadTabDataIfNeeded() }
        }
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
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

    private func tabIcon(_ index: Int) -> String {
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

    private var tabContent: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                if isLoading {
                    loadingView
                } else if let error = errorMessage {
                    errorView(error)
                } else {
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

    // MARK: - Overview Tab

    private var overviewTab: some View {
        VStack(spacing: 16) {
            if let v = visit {
                statusCard(v)
                pipelineCard(v)
                quickStatsGrid
            }
        }
    }

    private func statusCard(_ v: Visit) -> some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    if let name = v.client?.full_name {
                        Text(name)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.palmText)
                    }
                    Text("Created \(formattedDate(v.created_at))")
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                }
                Spacer()
                statusBadge(v.status)
            }

            if let scheduled = v.scheduled_start {
                HStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .font(.system(size: 12))
                        .foregroundColor(.palmBlue)
                    Text("Scheduled: \(formattedDate(scheduled))")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.palmSecondary)
                    Spacer()
                }
            }

            if let notes = v.admin_notes, !notes.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "note.text")
                        .font(.system(size: 12))
                        .foregroundColor(.palmOrange)
                    Text(notes)
                        .font(.system(size: 12))
                        .foregroundColor(.palmSecondary)
                    Spacer()
                }
            }
        }
        .padding(16)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
    }

    private func pipelineCard(_ v: Visit) -> some View {
        let steps: [(String, String, String)] = [
            ("transcription", "Transcribe", "waveform"),
            ("diarization", "Speakers", "person.2.fill"),
            ("billing", "Billables", "dollarsign.circle"),
            ("note", "Notes", "note.text"),
            ("contract", "Contract", "doc.text.fill"),
        ]

        return VStack(alignment: .leading, spacing: 12) {
            Text("Processing Pipeline")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.palmText)

            HStack(spacing: 0) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    let state = pipelineStepState(v, step: step.0)
                    VStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .fill(state.color.opacity(0.15))
                                .frame(width: 36, height: 36)
                            if state.isProcessing {
                                ProgressView()
                                    .scaleEffect(0.6)
                            } else {
                                Image(systemName: state.isComplete ? "checkmark" : step.2)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(state.color)
                            }
                        }
                        Text(step.1)
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(state.color)
                    }
                    .frame(maxWidth: .infinity)

                    if index < steps.count - 1 {
                        Rectangle()
                            .fill(state.isComplete ? Color.palmGreen.opacity(0.3) : Color.palmBorder)
                            .frame(height: 2)
                            .frame(maxWidth: 20)
                            .padding(.bottom, 18)
                    }
                }
            }
        }
        .padding(16)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.palmBorder, lineWidth: 1))
    }

    private var quickStatsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            statCard(
                icon: "text.quote",
                label: "Transcript",
                value: transcript?.word_count.map { "\($0) words" } ?? "—",
                color: .palmPrimary,
                tapAction: { activeTab = 1 }
            )
            statCard(
                icon: "dollarsign.circle.fill",
                label: "Billables",
                value: billables?.items.map { "\($0.count) items" } ?? "—",
                color: .palmGreen,
                tapAction: { activeTab = 2 }
            )
            statCard(
                icon: "note.text",
                label: "Notes",
                value: note != nil ? "SOAP Ready" : "—",
                color: .palmBlue,
                tapAction: { activeTab = 3 }
            )
            statCard(
                icon: "doc.text.fill",
                label: "Contract",
                value: contract?.title ?? "—",
                color: .palmPurple,
                tapAction: { activeTab = 4 }
            )
        }
    }

    private func statCard(icon: String, label: String, value: String, color: Color, tapAction: @escaping () -> Void) -> some View {
        Button(action: tapAction) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(color)
                    .frame(width: 36, height: 36)
                    .background(color.opacity(0.1))
                    .cornerRadius(10)

                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.palmSecondary)
                    Text(value)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.palmText)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Transcript Tab

    private var transcriptTab: some View {
        VStack(spacing: 14) {
            if let segments = transcript?.segments, !segments.isEmpty {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Transcript")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.palmText)
                        if let wc = transcript?.word_count, let dur = transcript?.total_duration_ms {
                            Text("\(wc) words · \(formatDuration(dur))")
                                .font(.system(size: 12))
                                .foregroundColor(.palmSecondary)
                        }
                    }
                    Spacer()
                }

                ForEach(Array(segments.enumerated()), id: \.offset) { _, segment in
                    transcriptBubble(segment)
                }
            } else if tabFetchFailed.contains(1) {
                tabErrorState(tab: 1)
            } else {
                emptyState(icon: "text.quote", title: "No Transcript", message: "The transcript will appear here once the audio has been processed.")
            }
        }
    }

    private func transcriptBubble(_ segment: VisitTranscriptSegment) -> some View {
        let speaker = segment.speaker_label ?? "Speaker"
        let isSpeaker1 = speaker.contains("1") || speaker.lowercased().contains("caregiver")
        let color: Color = isSpeaker1 ? .palmPrimary : .palmBlue

        return VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 22, height: 22)
                    .overlay(
                        Text(String(speaker.prefix(1)))
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(color)
                    )
                Text(speaker)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(color)
                if let start = segment.start_ms {
                    Text(formatDuration(start))
                        .font(.system(size: 10))
                        .foregroundColor(.palmSecondary)
                }
                Spacer()
            }

            Text(segment.text)
                .font(.system(size: 14))
                .foregroundColor(.palmText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }

    // MARK: - Billables Tab

    private var billablesTab: some View {
        VStack(spacing: 14) {
            if let items = billables?.items, !items.isEmpty {
                let unapprovedCount = items.filter { $0.is_approved != true && $0.is_flagged != true }.count

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Billable Items")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.palmText)
                        Text("\(items.count) items identified")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                    }
                    Spacer()
                    if unapprovedCount > 0 {
                        Button {
                            Task { await approveAllBillables() }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 12))
                                Text("Approve All")
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(Color.palmGreen)
                            .cornerRadius(8)
                        }
                    }
                }

                ForEach(Array(items.enumerated()), id: \.element.id) { idx, item in
                    billableRow(item, index: idx)
                }
            } else if tabFetchFailed.contains(2) {
                tabErrorState(tab: 2)
            } else {
                emptyState(icon: "dollarsign.circle", title: "No Billables", message: "Billable items will appear here once the assessment has been processed.")
            }
        }
    }

    private func billableRow(_ item: BillableItem, index: Int) -> some View {
        let isApproved = item.is_approved == true
        let isDenied = item.is_flagged == true
        let borderColor: Color = isApproved ? .palmGreen : (isDenied ? .red : Color.palmBorder)

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                if let code = item.code, !code.isEmpty {
                    Text(code)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.palmPrimary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.palmPrimary.opacity(0.08))
                        .cornerRadius(4)
                }
                if let cat = item.category {
                    Text(cat.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.palmSecondary)
                }
                Spacer()
                if isApproved {
                    Label("Approved", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmGreen)
                } else if isDenied {
                    Label("Denied", systemImage: "xmark.circle.fill")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.red)
                }
            }

            if let desc = item.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 13))
                    .foregroundColor(.palmText)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if !isApproved && !isDenied {
                HStack(spacing: 10) {
                    Button {
                        Task { await approveBillable(item, index: index) }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 11, weight: .bold))
                            Text("Approve")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.palmGreen)
                        .cornerRadius(8)
                    }

                    Button {
                        Task { await denyBillable(item, index: index) }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "xmark")
                                .font(.system(size: 11, weight: .bold))
                            Text("Deny")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.08))
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.red.opacity(0.3), lineWidth: 1))
                    }
                }
            }
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(borderColor.opacity(isApproved || isDenied ? 0.4 : 0.15), lineWidth: isApproved || isDenied ? 1.5 : 1))
    }

    private func approveBillable(_ item: BillableItem, index: Int) async {
        do {
            let _ = try await api.approveBillableItem(visitId: visitId, itemId: item.id)
            await MainActor.run {
                if var items = billables?.items {
                    items[index] = BillableItem(id: item.id, visit_id: item.visit_id, code: item.code, category: item.category, description: item.description, start_ms: item.start_ms, end_ms: item.end_ms, minutes: item.minutes, evidence: item.evidence, is_approved: true, is_flagged: false, adjusted_minutes: item.adjusted_minutes)
                    billables = VisitBillablesResponse(items: items, total_minutes: billables?.total_minutes, total_adjusted_minutes: billables?.total_adjusted_minutes, categories: billables?.categories)
                }
            }
        } catch {}
    }

    private func denyBillable(_ item: BillableItem, index: Int) async {
        do {
            let _ = try await api.denyBillableItem(visitId: visitId, itemId: item.id)
            await MainActor.run {
                if var items = billables?.items {
                    items[index] = BillableItem(id: item.id, visit_id: item.visit_id, code: item.code, category: item.category, description: item.description, start_ms: item.start_ms, end_ms: item.end_ms, minutes: item.minutes, evidence: item.evidence, is_approved: false, is_flagged: true, adjusted_minutes: item.adjusted_minutes)
                    billables = VisitBillablesResponse(items: items, total_minutes: billables?.total_minutes, total_adjusted_minutes: billables?.total_adjusted_minutes, categories: billables?.categories)
                }
            }
        } catch {}
    }

    private func approveAllBillables() async {
        guard let items = billables?.items else { return }
        for (idx, item) in items.enumerated() where item.is_approved != true && item.is_flagged != true {
            await approveBillable(item, index: idx)
        }
    }

    // MARK: - Notes Tab (SOAP)

    private var notesTab: some View {
        VStack(spacing: 14) {
            if let n = note {
                HStack {
                    Text("Clinical Notes (SOAP)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.palmText)
                    Spacer()

                    Button { Task { await exportFile(type: "note.pdf") } } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.down.doc.fill").font(.system(size: 12))
                            Text("PDF").font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.palmPrimary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.palmPrimary.opacity(0.08))
                        .cornerRadius(8)
                    }
                }

                if let sd = n.structured_data {
                    if let mood = sd.client_mood, !mood.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "face.smiling")
                                .font(.system(size: 14))
                                .foregroundColor(.palmOrange)
                            Text("Mood: \(mood)")
                                .font(.system(size: 13))
                                .foregroundColor(.palmText)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color.palmOrange.opacity(0.06))
                        .cornerRadius(10)
                    }

                    if let subjective = sd.subjective, !subjective.isEmpty {
                        soapSection(letter: "S", title: "Subjective", content: subjective, color: .palmBlue)
                    }
                    if let objective = sd.objective, !objective.isEmpty {
                        soapSection(letter: "O", title: "Objective", content: objective, color: .palmGreen)
                    }
                    if let assessment = sd.assessment, !assessment.isEmpty {
                        soapSection(letter: "A", title: "Assessment", content: assessment, color: .palmOrange)
                    }
                    if let plan = sd.plan, !plan.isEmpty {
                        soapSection(letter: "P", title: "Plan", content: plan, color: .palmPurple)
                    }

                    let taskStrings = sd.tasksAsStrings
                    if !taskStrings.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                                Image(systemName: "checklist")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.palmPrimary)
                                Text("Tasks Performed")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.palmText)
                            }
                            ForEach(taskStrings, id: \.self) { task in
                                HStack(alignment: .top, spacing: 8) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 12))
                                        .foregroundColor(.palmGreen)
                                        .padding(.top, 2)
                                    Text(task)
                                        .font(.system(size: 13))
                                        .foregroundColor(.palmText)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                        .padding(14)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                    }

                    if let safety = sd.safety_observations, !safety.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                                Image(systemName: "exclamationmark.shield.fill")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.red)
                                Text("Safety Observations")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.palmText)
                            }
                            Text(safety)
                                .font(.system(size: 13))
                                .foregroundColor(.palmText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(14)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.red.opacity(0.15), lineWidth: 1))
                    }

                    if let next = sd.next_visit_plan, !next.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                                Image(systemName: "calendar.badge.clock")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.palmBlue)
                                Text("Next Visit Plan")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.palmText)
                            }
                            Text(next)
                                .font(.system(size: 13))
                                .foregroundColor(.palmText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(14)
                        .background(Color(UIColor.secondarySystemGroupedBackground))
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBlue.opacity(0.15), lineWidth: 1))
                    }
                }

                if let narrative = n.narrative, !narrative.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            Image(systemName: "doc.plaintext")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.palmSecondary)
                            Text("Narrative Summary")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.palmText)
                        }
                        Text(narrative)
                            .font(.system(size: 13))
                            .foregroundColor(.palmText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(14)
                    .background(Color(UIColor.secondarySystemGroupedBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                }
            } else if tabFetchFailed.contains(3) {
                tabErrorState(tab: 3)
            } else {
                emptyState(icon: "note.text", title: "No Notes", message: "Clinical notes will appear here once the assessment has been processed.")
            }
        }
    }

    private func soapSection(letter: String, title: String, content: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(letter)
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(.white)
                    .frame(width: 26, height: 26)
                    .background(color)
                    .cornerRadius(7)
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
                Spacer()
            }

            Text(content)
                .font(.system(size: 13))
                .foregroundColor(.palmText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Contract Tab

    private var currentStyle: ContractStyle {
        builtInContractStyles.first { $0.id == selectedContractStyle } ?? builtInContractStyles[1]
    }

    private var contractTab: some View {
        VStack(spacing: 0) {
            if let c = contract {
                contractHeader(c)
                    .padding(.bottom, 14)

                currentStyleBadge
                    .padding(.bottom, 10)

                contractRateCards(c)
                    .padding(.bottom, 14)
                contractServicesSection(c)
                contractScheduleSection(c)
                contractDocumentSection(c)
            } else if tabFetchFailed.contains(4) {
                tabErrorState(tab: 4)
            } else {
                emptyState(icon: "doc.text.fill", title: "No Contract", message: "The contract will appear here once the assessment has been fully processed.")
            }
        }
    }

    private func contractHeader(_ c: VisitContract) -> some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(c.title ?? "Service Agreement")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.palmText)
                    if let status = c.status {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(status == "active" ? Color.palmGreen : Color.palmOrange)
                                .frame(width: 6, height: 6)
                            Text(status.capitalized)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(status == "active" ? .palmGreen : .palmOrange)
                        }
                    }
                }
                Spacer()

                Button { showStylePicker = true } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "paintbrush.fill")
                            .font(.system(size: 12))
                        Text("Style")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.palmPrimary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color.palmPrimary.opacity(0.08))
                    .cornerRadius(8)
                }

                Menu {
                    Button { Task { await exportFile(type: "contract.pdf") } } label: {
                        Label("Download PDF", systemImage: "arrow.down.doc.fill")
                    }
                    Button { Task { await exportFile(type: "contract.docx") } } label: {
                        Label("Download DOCX", systemImage: "doc.fill")
                    }
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.palmPrimary)
                        .frame(width: 36, height: 36)
                        .background(Color.palmPrimary.opacity(0.08))
                        .cornerRadius(10)
                }
            }
        }
        .sheet(isPresented: $showStylePicker) {
            ContractStylesView(selectedStyleId: $selectedContractStyle, contractTitle: c.title)
        }
    }

    private var currentStyleBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: currentStyle.icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(currentStyle.accentColor)
            Text("Using \(currentStyle.name) style")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.palmSecondary)
            Spacer()
            Button {
                showStylePicker = true
            } label: {
                Text("Change")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(currentStyle.accentColor)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(currentStyle.accentColor.opacity(0.04))
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(currentStyle.accentColor.opacity(0.1), lineWidth: 1))
    }

    private func contractRateCards(_ c: VisitContract) -> some View {
        HStack(spacing: 10) {
            if let rate = c.hourly_rate {
                VStack(spacing: 4) {
                    Text("$\(String(format: "%.2f", rate))")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.palmGreen)
                    Text("per hour")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.palmGreen.opacity(0.06))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmGreen.opacity(0.15), lineWidth: 1))
            }
            if let hours = c.weekly_hours {
                VStack(spacing: 4) {
                    Text("\(String(format: "%.0f", hours))h")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.palmBlue)
                    Text("per week")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.palmBlue.opacity(0.06))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBlue.opacity(0.15), lineWidth: 1))
            }
            if let rate = c.hourly_rate, let hours = c.weekly_hours {
                VStack(spacing: 4) {
                    Text("$\(String(format: "%.0f", rate * hours))")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.palmPrimary)
                    Text("per week")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.palmSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.palmPrimary.opacity(0.06))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmPrimary.opacity(0.15), lineWidth: 1))
            }
        }
    }

    private func contractServicesSection(_ c: VisitContract) -> some View {
        Group {
            if let services = c.services, !services.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 6) {
                        Image(systemName: "list.clipboard.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmPrimary)
                        Text("Services")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.palmText)
                        Spacer()
                        Text("\(services.count) services")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                    }

                    ForEach(Array(services.enumerated()), id: \.offset) { _, svc in
                        if let dict = svc.value as? [String: Any] {
                            let name = dict["name"] as? String ?? "Service"
                            let desc = dict["description"] as? String ?? ""
                            let freq = dict["frequency"] as? String
                            let priority = dict["priority"] as? String

                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: serviceIcon(for: name))
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.palmPrimary)
                                    .frame(width: 28, height: 28)
                                    .background(Color.palmPrimary.opacity(0.08))
                                    .cornerRadius(7)

                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(name)
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundColor(.palmText)
                                        Spacer()
                                        if let p = priority {
                                            Text(p)
                                                .font(.system(size: 10, weight: .bold))
                                                .foregroundColor(p == "High" ? .red : (p == "Medium" ? .palmOrange : .palmSecondary))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background((p == "High" ? Color.red : (p == "Medium" ? Color.palmOrange : Color.palmSecondary)).opacity(0.08))
                                                .cornerRadius(4)
                                        }
                                    }
                                    if !desc.isEmpty {
                                        Text(desc)
                                            .font(.system(size: 12))
                                            .foregroundColor(.palmSecondary)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                    if let f = freq {
                                        HStack(spacing: 4) {
                                            Image(systemName: "clock").font(.system(size: 10))
                                            Text(f).font(.system(size: 11, weight: .medium))
                                        }
                                        .foregroundColor(.palmBlue)
                                    }
                                }
                            }
                            .padding(12)
                            .background(Color(UIColor.tertiarySystemGroupedBackground))
                            .cornerRadius(10)
                        }
                    }
                }
                .padding(14)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                .padding(.bottom, 14)
            }
        }
    }

    private func contractScheduleSection(_ c: VisitContract) -> some View {
        Group {
            if let sched = c.schedule, !sched.isEmpty {
                let freq = (sched["frequency"]?.value as? String) ?? ""
                let serviceHours = sched["service_hours"]?.value as? [[String: Any]]
                let rationale = sched["rationale"]?.value as? String

                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 6) {
                        Image(systemName: "calendar.badge.clock")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmBlue)
                        Text("Schedule")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.palmText)
                    }

                    if !freq.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "repeat").font(.system(size: 12)).foregroundColor(.palmBlue)
                            Text("Frequency: \(freq)")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.palmText)
                        }
                    }

                    if let hours = serviceHours, !hours.isEmpty {
                        ForEach(Array(hours.enumerated()), id: \.offset) { _, sh in
                            let svc = sh["service"] as? String ?? "Service"
                            let hrs = sh["hours_per_week"] as? Int ?? (sh["hours_per_week"] as? Double).map { Int($0) } ?? 0
                            let level = sh["need_level"] as? String ?? ""

                            HStack {
                                Text(svc)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.palmText)
                                Spacer()
                                if !level.isEmpty {
                                    Text(level.capitalized)
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundColor(.palmSecondary)
                                }
                                Text("\(hrs) hrs/wk")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.palmPrimary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(UIColor.tertiarySystemGroupedBackground))
                            .cornerRadius(8)
                        }
                    }

                    if let r = rationale, !r.isEmpty {
                        Text(r)
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 4)
                    }
                }
                .padding(14)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                .padding(.bottom, 14)
            }
        }
    }

    private func contractDocumentSection(_ c: VisitContract) -> some View {
        Group {
            if let content = c.content, !content.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 6) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.palmSecondary)
                        Text("Full Agreement")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.palmText)
                        Spacer()
                        Button { showFullContract.toggle() } label: {
                            HStack(spacing: 4) {
                                Text(showFullContract ? "Collapse" : "View")
                                    .font(.system(size: 12, weight: .medium))
                                Image(systemName: showFullContract ? "chevron.up" : "chevron.down")
                                    .font(.system(size: 10, weight: .bold))
                            }
                            .foregroundColor(.palmPrimary)
                        }
                    }

                    if showFullContract {
                        contractFormattedContent(content)
                    } else {
                        let preview = String(content.prefix(200)).trimmingCharacters(in: .whitespacesAndNewlines)
                        Text(preview + "...")
                            .font(.system(size: 12))
                            .foregroundColor(.palmSecondary)
                            .lineLimit(4)
                    }
                }
                .padding(14)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
            }
        }
    }

    private func contractFormattedContent(_ content: String) -> some View {
        let sections = parseContractSections(content)
        return VStack(alignment: .leading, spacing: 16) {
            ForEach(Array(sections.enumerated()), id: \.offset) { _, section in
                VStack(alignment: .leading, spacing: 6) {
                    if !section.heading.isEmpty {
                        Text(section.heading)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.palmPrimary)
                            .padding(.bottom, 2)
                        Divider()
                    }
                    Text(section.body)
                        .font(.system(size: 12))
                        .foregroundColor(.palmText)
                        .fixedSize(horizontal: false, vertical: true)
                        .lineSpacing(3)
                }
            }
        }
    }

    private func serviceIcon(for name: String) -> String {
        let lower = name.lowercased()
        if lower.contains("personal") || lower.contains("adl") { return "figure.stand" }
        if lower.contains("meal") || lower.contains("nutrition") { return "fork.knife" }
        if lower.contains("house") || lower.contains("cleaning") { return "house.fill" }
        if lower.contains("companion") { return "person.2.fill" }
        if lower.contains("respite") { return "heart.fill" }
        if lower.contains("transport") { return "car.fill" }
        if lower.contains("medic") { return "pills.fill" }
        if lower.contains("safety") { return "shield.checkered" }
        if lower.contains("mobility") { return "figure.walk" }
        return "cross.case.fill"
    }

    private struct ContractSection {
        let heading: String
        let body: String
    }

    private func parseContractSections(_ content: String) -> [ContractSection] {
        let lines = content.components(separatedBy: "\n")
        var sections: [ContractSection] = []
        var currentHeading = ""
        var currentBody: [String] = []

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix("====") || trimmed.hasPrefix("----") { continue }
            let isSectionHeader = !trimmed.isEmpty &&
                (trimmed == trimmed.uppercased() && trimmed.count > 3 && trimmed.rangeOfCharacter(from: .letters) != nil) ||
                trimmed.range(of: #"^\d+\.\s+[A-Z]"#, options: .regularExpression) != nil

            if isSectionHeader {
                if !currentHeading.isEmpty || !currentBody.isEmpty {
                    let bodyText = currentBody.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                    if !bodyText.isEmpty || !currentHeading.isEmpty {
                        sections.append(ContractSection(heading: currentHeading, body: bodyText))
                    }
                }
                currentHeading = trimmed.replacingOccurrences(of: #"^\d+\.\s+"#, with: "", options: .regularExpression)
                    .capitalized
                currentBody = []
            } else {
                currentBody.append(line)
            }
        }
        if !currentHeading.isEmpty || !currentBody.isEmpty {
            let bodyText = currentBody.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
            if !bodyText.isEmpty { sections.append(ContractSection(heading: currentHeading, body: bodyText)) }
        }
        return sections
    }

    private func miniStat(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.palmSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
    }

    // MARK: - Shared Components

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading assessment...")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.palmSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 32))
                .foregroundColor(.palmOrange)
            Text("Error Loading Assessment")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.palmText)
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
            Button("Retry") { Task { await loadVisit() } }
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 10)
                .background(Color.palmPrimary)
                .cornerRadius(10)
                .accessibilityLabel("Retry loading assessment")
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func emptyState(icon: String, title: String, message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundColor(.palmSecondary.opacity(0.35))
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmText)
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 20)
    }

    private func tabErrorState(tab: Int) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 32))
                .foregroundColor(.palmOrange)
            Text("Failed to Load")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.palmText)
            Text("Check your connection and try again.")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
            Button {
                tabFetchFailed.remove(tab)
                Task { await loadTabDataIfNeeded() }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12, weight: .bold))
                    Text("Retry")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.palmPrimary)
                .cornerRadius(10)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func statusBadge(_ status: String) -> some View {
        let color: Color = {
            switch status.lowercased() {
            case "completed": return .palmGreen
            case "processing": return .palmBlue
            case "pending": return .palmOrange
            case "failed": return .red
            default: return .palmSecondary
            }
        }()

        return HStack(spacing: 4) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(status.capitalized)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(color.opacity(0.1))
        .cornerRadius(10)
    }

    // MARK: - Pipeline Helpers

    private struct PipelineStepState {
        let isComplete: Bool
        let isProcessing: Bool
        let color: Color
    }

    private func pipelineStepState(_ v: Visit, step: String) -> PipelineStepState {
        guard let ps = v.pipeline_state,
              let stepData = ps[step]?.value as? [String: Any],
              let status = stepData["status"] as? String else {
            return PipelineStepState(isComplete: false, isProcessing: false, color: .palmSecondary)
        }

        switch status {
        case "completed":
            return PipelineStepState(isComplete: true, isProcessing: false, color: .palmGreen)
        case "processing", "running":
            return PipelineStepState(isComplete: false, isProcessing: true, color: .palmBlue)
        case "failed":
            return PipelineStepState(isComplete: false, isProcessing: false, color: .red)
        default:
            return PipelineStepState(isComplete: false, isProcessing: false, color: .palmSecondary)
        }
    }

    // MARK: - Data Loading

    private func loadVisit() async {
        isLoading = true
        errorMessage = nil
        do {
            let v = try await api.fetchVisit(id: visitId)
            await MainActor.run {
                visit = v
                isLoading = false
            }
            await loadTabDataIfNeeded()
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    private func loadTabDataIfNeeded() async {
        switch activeTab {
        case 1:
            guard transcript == nil else { return }
            do {
                let t = try await api.fetchVisitTranscript(visitId: visitId)
                await MainActor.run { transcript = t; tabFetchFailed.remove(1) }
            } catch {
                await MainActor.run { tabFetchFailed.insert(1) }
            }
        case 2:
            guard billables == nil else { return }
            do {
                let b = try await api.fetchVisitBillables(visitId: visitId)
                await MainActor.run { billables = b; tabFetchFailed.remove(2) }
            } catch {
                await MainActor.run { tabFetchFailed.insert(2) }
            }
        case 3:
            guard note == nil else { return }
            do {
                let n = try await api.fetchVisitNote(visitId: visitId)
                await MainActor.run { note = n; tabFetchFailed.remove(3) }
            } catch {
                await MainActor.run { tabFetchFailed.insert(3) }
            }
        case 4:
            guard contract == nil else { return }
            do {
                let c = try await api.fetchVisitContract(visitId: visitId)
                await MainActor.run { contract = c; tabFetchFailed.remove(4) }
            } catch {
                await MainActor.run { tabFetchFailed.insert(4) }
            }
        default:
            break
        }
    }

    private func exportFile(type: String) async {
        do {
            let localURL = try await api.downloadFile(
                path: "/exports/visits/\(visitId)/\(type)",
                suggestedFilename: "\(clientName ?? "visit")_\(type)"
            )
            await MainActor.run {
                let activityVC = UIActivityViewController(activityItems: [localURL], applicationActivities: nil)
                if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                   let rootVC = windowScene.windows.first?.rootViewController {
                    rootVC.present(activityVC, animated: true)
                }
            }
        } catch {
            await MainActor.run { errorMessage = "Export failed: \(error.localizedDescription)" }
        }
    }

    private func restartAssessment() async {
        do {
            try await api.restartVisit(visitId: visitId)
            let v = try await api.fetchVisit(id: visitId)
            await MainActor.run {
                visit = v
                transcript = nil
                billables = nil
                note = nil
                contract = nil
            }
        } catch {
            await MainActor.run { errorMessage = "Restart failed: \(error.localizedDescription)" }
        }
    }

    // MARK: - Formatting

    private func formattedDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }
        guard let parsedDate = date else { return isoString }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .short
        return display.string(from: parsedDate)
    }

    private func formatDuration(_ ms: Int) -> String {
        let totalSeconds = ms / 1000
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
