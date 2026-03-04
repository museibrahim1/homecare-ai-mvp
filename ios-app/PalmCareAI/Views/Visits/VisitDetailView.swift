import SwiftUI

struct VisitDetailView: View {
    @EnvironmentObject var api: APIService
    let visitId: String
    var clientName: String?

    @State private var visit: Visit?
    @State private var transcript: VisitTranscriptResponse?
    @State private var billables: VisitBillablesResponse?
    @State private var note: VisitNote?
    @State private var contract: VisitContract?

    @State private var isLoading = true
    @State private var activeTab = 0
    @State private var errorMessage: String?
    @State private var isRefreshing = false

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
        .task { await loadVisit() }
        .onChange(of: activeTab) { _ in
            Task { await loadTabDataIfNeeded() }
        }
    }

    // MARK: - Tab Bar

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 2) {
                ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { activeTab = index }
                    } label: {
                        VStack(spacing: 6) {
                            HStack(spacing: 5) {
                                Image(systemName: tabIcon(index))
                                    .font(.system(size: 11, weight: .semibold))
                                Text(tab)
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundColor(activeTab == index ? .palmPrimary : .palmSecondary)

                            Rectangle()
                                .fill(activeTab == index ? Color.palmPrimary : Color.clear)
                                .frame(height: 2)
                        }
                        .padding(.horizontal, 14)
                        .padding(.top, 10)
                    }
                    .accessibilityLabel("\(tab) tab")
                }
            }
            .padding(.horizontal, 12)
        }
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
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Billable Items")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.palmText)
                        if let total = billables?.total_minutes {
                            Text("\(items.count) items · \(String(format: "%.0f", total)) minutes total")
                                .font(.system(size: 12))
                                .foregroundColor(.palmSecondary)
                        }
                    }
                    Spacer()
                }

                if let categories = billables?.categories, !categories.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(Array(categories.keys).sorted(), id: \.self) { cat in
                                Text(cat)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(.palmPrimary)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(Color.palmPrimary.opacity(0.08))
                                    .cornerRadius(8)
                            }
                        }
                    }
                }

                ForEach(items) { item in
                    billableRow(item)
                }
            } else {
                emptyState(icon: "dollarsign.circle", title: "No Billables", message: "Billable items will appear here once the assessment has been processed.")
            }
        }
    }

    private func billableRow(_ item: BillableItem) -> some View {
        HStack(spacing: 12) {
            VStack {
                Image(systemName: item.is_approved == true ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18))
                    .foregroundColor(item.is_approved == true ? .palmGreen : .palmSecondary)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    if let code = item.code, !code.isEmpty {
                        Text(code)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.palmPrimary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.palmPrimary.opacity(0.08))
                            .cornerRadius(4)
                    }
                    if let cat = item.category {
                        Text(cat)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.palmSecondary)
                    }
                    Spacer()
                }

                if let desc = item.description, !desc.isEmpty {
                    Text(desc)
                        .font(.system(size: 13))
                        .foregroundColor(.palmText)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let evidence = item.evidence, let evidenceStr = evidence.value as? String, !evidenceStr.isEmpty {
                    Text(evidenceStr)
                        .font(.system(size: 11))
                        .foregroundColor(.palmSecondary)
                        .lineLimit(2)
                }
            }

            if let mins = item.adjusted_minutes ?? item.minutes {
                Text("\(String(format: "%.0f", mins))m")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.palmPrimary)
            }
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
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
                }

                if let sd = n.structured_data {
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

                    if let tasks = sd.tasks_performed, !tasks.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 6) {
                                Image(systemName: "checklist")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.palmPrimary)
                                Text("Tasks Performed")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.palmText)
                            }

                            ForEach(tasks, id: \.self) { task in
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

    private var contractTab: some View {
        VStack(spacing: 14) {
            if let c = contract {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(c.title ?? "Contract")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.palmText)
                        if let status = c.status {
                            Text(status.capitalized)
                                .font(.system(size: 12))
                                .foregroundColor(.palmSecondary)
                        }
                    }
                    Spacer()

                    Button { Task { await exportFile(type: "contract.pdf") } } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.down.doc.fill")
                                .font(.system(size: 12))
                            Text("PDF")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.palmPrimary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.palmPrimary.opacity(0.08))
                        .cornerRadius(8)
                    }
                }

                if c.services != nil && !(c.services?.isEmpty ?? true) {
                    contractDetailCard(icon: "list.bullet", label: "Services", value: c.servicesDescription, color: .palmPrimary)
                }
                if c.schedule != nil && !(c.schedule?.isEmpty ?? true) {
                    contractDetailCard(icon: "calendar", label: "Schedule", value: c.scheduleDescription, color: .palmBlue)
                }

                HStack(spacing: 12) {
                    if let rate = c.hourly_rate {
                        miniStat(label: "Hourly Rate", value: "$\(String(format: "%.2f", rate))", color: .palmGreen)
                    }
                    if let hours = c.weekly_hours {
                        miniStat(label: "Weekly Hours", value: "\(String(format: "%.1f", hours))h", color: .palmBlue)
                    }
                }

                if let content = c.content, !content.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.palmSecondary)
                            Text("Contract Content")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.palmText)
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
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
                }
            } else {
                emptyState(icon: "doc.text.fill", title: "No Contract", message: "The contract will appear here once the assessment has been fully processed.")
            }
        }
    }

    private func contractDetailCard(icon: String, label: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(color)
                Text(label)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.palmText)
            }
            Text(value)
                .font(.system(size: 13))
                .foregroundColor(.palmText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
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
            if let t = try? await api.fetchVisitTranscript(visitId: visitId) {
                await MainActor.run { transcript = t }
            }
        case 2:
            guard billables == nil else { return }
            if let b = try? await api.fetchVisitBillables(visitId: visitId) {
                await MainActor.run { billables = b }
            }
        case 3:
            guard note == nil else { return }
            if let n = try? await api.fetchVisitNote(visitId: visitId) {
                await MainActor.run { note = n }
            }
        case 4:
            guard contract == nil else { return }
            if let c = try? await api.fetchVisitContract(visitId: visitId) {
                await MainActor.run { contract = c }
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
