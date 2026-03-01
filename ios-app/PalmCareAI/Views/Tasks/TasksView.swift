import SwiftUI

struct TasksView: View {
    @EnvironmentObject var api: APIService

    @State private var tasks: [TaskItem] = []
    @State private var isLoading = true
    @State private var selectedFilter = "All"
    @State private var showAddTask = false

    private let filters = ["All", "To Do", "In Progress", "Completed"]

    var filteredTasks: [TaskItem] {
        switch selectedFilter {
        case "To Do": return tasks.filter { $0.status.lowercased() == "todo" || $0.status.lowercased() == "pending" }
        case "In Progress": return tasks.filter { $0.status.lowercased() == "in_progress" || $0.status.lowercased() == "active" }
        case "Completed": return tasks.filter { $0.status.lowercased() == "completed" || $0.status.lowercased() == "done" }
        default: return tasks
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            filterBar

            Group {
                if isLoading {
                    VStack { Spacer(); ProgressView("Loading tasks..."); Spacer() }
                } else if filteredTasks.isEmpty {
                    emptyState
                } else {
                    taskList
                }
            }
        }
        .background(Color.palmBackground)
        .navigationTitle("Tasks")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button { showAddTask = true } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(.palmPrimary)
                }
            }
        }
        .sheet(isPresented: $showAddTask) {
            AddTaskSheet(onSave: { task in
                Task {
                    do {
                        let created = try await api.createTask(task)
                        await MainActor.run { tasks.insert(created, at: 0) }
                    } catch {}
                }
            })
        }
        .task { await loadTasks() }
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(filters, id: \.self) { filter in
                    let count: Int = {
                        switch filter {
                        case "To Do": return tasks.filter { $0.status.lowercased() == "todo" || $0.status.lowercased() == "pending" }.count
                        case "In Progress": return tasks.filter { $0.status.lowercased() == "in_progress" || $0.status.lowercased() == "active" }.count
                        case "Completed": return tasks.filter { $0.status.lowercased() == "completed" || $0.status.lowercased() == "done" }.count
                        default: return tasks.count
                        }
                    }()

                    Button { withAnimation { selectedFilter = filter } } label: {
                        HStack(spacing: 5) {
                            Text(filter)
                                .font(.system(size: 12, weight: .semibold))
                            if count > 0 {
                                Text("\(count)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(selectedFilter == filter ? .palmPrimary : .white)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 1)
                                    .background(selectedFilter == filter ? Color.white : Color.palmSecondary.opacity(0.5))
                                    .cornerRadius(8)
                            }
                        }
                        .foregroundColor(selectedFilter == filter ? .white : .palmSecondary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(selectedFilter == filter ? Color.palmPrimary : Color.white)
                        .cornerRadius(18)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .stroke(selectedFilter == filter ? Color.clear : Color.palmBorder, lineWidth: 1)
                        )
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
        }
        .background(Color.white)
    }

    // MARK: - Task List

    private var taskList: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 8) {
                ForEach(filteredTasks) { task in
                    TaskCard(task: task, onComplete: {
                        Task { await completeTask(task) }
                    }, onDelete: {
                        Task { await deleteTask(task) }
                    })
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 4)
            .padding(.bottom, 120)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 14) {
            Spacer()
            Image(systemName: "checklist")
                .font(.system(size: 44))
                .foregroundColor(.palmSecondary.opacity(0.4))
            Text("No Tasks")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.palmText)
            Text("Tap + to create your first task")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)

            Button { showAddTask = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .bold))
                    Text("Add new task")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(
                    LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600], startPoint: .leading, endPoint: .trailing)
                )
                .cornerRadius(12)
            }
            .padding(.top, 8)

            Spacer()
        }
    }

    // MARK: - Actions

    private func loadTasks() async {
        do {
            let fetched = try await api.fetchTasks()
            await MainActor.run {
                tasks = fetched
                isLoading = false
            }
        } catch {
            await MainActor.run { isLoading = false }
        }
    }

    private func completeTask(_ task: TaskItem) async {
        do {
            let updated = try await api.completeTask(id: task.id)
            await MainActor.run {
                if let idx = tasks.firstIndex(where: { $0.id == task.id }) {
                    tasks[idx] = updated
                }
            }
        } catch {}
    }

    private func deleteTask(_ task: TaskItem) async {
        do {
            try await api.deleteTask(id: task.id)
            await MainActor.run {
                tasks.removeAll { $0.id == task.id }
            }
        } catch {}
    }
}

// MARK: - Task Card

struct TaskCard: View {
    let task: TaskItem
    let onComplete: () -> Void
    let onDelete: () -> Void

    private var isCompleted: Bool {
        task.status.lowercased() == "completed" || task.status.lowercased() == "done"
    }

    private var priorityColor: Color {
        switch task.priority?.lowercased() {
        case "high": return .red
        case "medium": return .palmOrange
        case "low": return .palmGreen
        default: return .palmSecondary
        }
    }

    private var statusColor: Color {
        switch task.status.lowercased() {
        case "completed", "done": return .palmGreen
        case "in_progress", "active": return .palmBlue
        default: return .palmOrange
        }
    }

    private var formattedDue: String? {
        guard let date = task.dueDate else { return nil }
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f.string(from: date)
    }

    var body: some View {
        HStack(spacing: 12) {
            Button { if !isCompleted { onComplete() } } label: {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundColor(isCompleted ? .palmGreen : .palmBorder)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(isCompleted ? .palmSecondary : .palmText)
                    .strikethrough(isCompleted)
                    .lineLimit(2)

                HStack(spacing: 8) {
                    if let priority = task.priority, !priority.isEmpty {
                        HStack(spacing: 3) {
                            Circle().fill(priorityColor).frame(width: 6, height: 6)
                            Text(priority.capitalized)
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(priorityColor)
                        }
                    }

                    if let due = formattedDue {
                        HStack(spacing: 3) {
                            Image(systemName: "calendar")
                                .font(.system(size: 9))
                            Text(due)
                                .font(.system(size: 10, weight: .medium))
                        }
                        .foregroundColor(.palmSecondary)
                    }

                    Text(task.status.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(statusColor)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(statusColor.opacity(0.1))
                        .cornerRadius(4)
                }
            }

            Spacer()

            Button { onDelete() } label: {
                Image(systemName: "trash")
                    .font(.system(size: 14))
                    .foregroundColor(.palmSecondary.opacity(0.5))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
    }
}

// MARK: - Add Task Sheet

struct AddTaskSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (TaskCreate) -> Void

    @State private var title = ""
    @State private var description = ""
    @State private var priority = "medium"
    @State private var hasDueDate = false
    @State private var dueDate = Date()

    private let priorities = ["low", "medium", "high"]

    private let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    var body: some View {
        NavigationStack {
            Form {
                Section("Task Details") {
                    TextField("Title", text: $title)
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Priority") {
                    Picker("Priority", selection: $priority) {
                        ForEach(priorities, id: \.self) { p in
                            Text(p.capitalized).tag(p)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Due Date") {
                    Toggle("Set due date", isOn: $hasDueDate)
                        .tint(.palmPrimary)
                    if hasDueDate {
                        DatePicker("Due", selection: $dueDate, displayedComponents: .date)
                    }
                }
            }
            .navigationTitle("New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        let task = TaskCreate(
                            title: title,
                            description: description.isEmpty ? nil : description,
                            status: "todo",
                            priority: priority,
                            due_date: hasDueDate ? isoFormatter.string(from: dueDate) : nil,
                            related_client_id: nil
                        )
                        onSave(task)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                    .font(.system(size: 15, weight: .bold))
                }
            }
        }
    }
}
