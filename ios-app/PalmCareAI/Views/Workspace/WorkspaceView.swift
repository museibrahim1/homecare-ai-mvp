import SwiftUI

// MARK: - Normal User Workspace (Calendar + Documents)

struct WorkspaceView: View {
    @EnvironmentObject var api: APIService
    @State private var selectedSection = 0

    private let sections = ["Calendar", "Documents"]
    private let sectionIcons = ["calendar", "doc.text.fill"]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                sectionPicker
                    .padding(.top, 8)

                TabView(selection: $selectedSection) {
                    CalendarView()
                        .tag(0)

                    ContractsView()
                        .tag(1)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut(duration: 0.2), value: selectedSection)
            }
            .background(Color.palmBackground)
            .navigationTitle("Workspace")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var sectionPicker: some View {
        WorkspaceSectionPicker(
            sections: sections,
            sectionIcons: sectionIcons,
            selectedSection: $selectedSection
        )
    }
}

// MARK: - Admin Workspace (all normal user views in one tab)

struct AdminWorkspaceView: View {
    @EnvironmentObject var api: APIService
    @State private var selectedSection = 0

    private let sections = ["Home", "Clients", "Palm It", "Calendar", "Documents", "Settings"]
    private let sectionIcons = [
        "house.fill", "person.2.fill", "mic.fill",
        "calendar", "doc.text.fill", "gearshape.fill"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                sectionPicker
                    .padding(.top, 8)

                Group {
                    switch selectedSection {
                    case 0:
                        HomeView(onNavigateToRecord: {
                            withAnimation { selectedSection = 2 }
                        })
                    case 1:
                        ClientsView()
                    case 2:
                        RecordView()
                    case 3:
                        CalendarView()
                    case 4:
                        ContractsView()
                    case 5:
                        SettingsView()
                    default:
                        HomeView(onNavigateToRecord: {
                            withAnimation { selectedSection = 2 }
                        })
                    }
                }
                .environmentObject(api)
            }
            .background(Color.palmBackground)
            .navigationTitle("Workspace")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var sectionPicker: some View {
        WorkspaceSectionPicker(
            sections: sections,
            sectionIcons: sectionIcons,
            selectedSection: $selectedSection
        )
    }
}

// MARK: - Shared Section Picker

struct WorkspaceSectionPicker: View {
    let sections: [String]
    let sectionIcons: [String]
    @Binding var selectedSection: Int

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(sections.enumerated()), id: \.offset) { index, title in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { selectedSection = index }
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: sectionIcons[index])
                                .font(.system(size: 11, weight: .semibold))
                                .accessibilityHidden(true)

                            Text(title)
                                .font(.system(size: 12, weight: .semibold))
                                .lineLimit(1)
                                .fixedSize()
                        }
                        .foregroundColor(selectedSection == index ? .white : .palmSecondary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(
                            selectedSection == index
                                ? AnyShapeStyle(LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600], startPoint: .leading, endPoint: .trailing))
                                : AnyShapeStyle(Color(UIColor.secondarySystemGroupedBackground))
                        )
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(selectedSection == index ? Color.clear : Color.palmBorder, lineWidth: 1)
                        )
                    }
                    .accessibilityLabel("\(title), \(selectedSection == index ? "selected" : "")")
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 8)
        }
    }
}
