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
            .background(PalmGlassBackground())
            .navigationTitle("Workspace")
            .navigationBarTitleDisplayMode(.inline)
            .palmTransparentNavBar()
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
        HStack(spacing: 4) {
            ForEach(Array(sections.enumerated()), id: \.offset) { index, title in
                let isSelected = selectedSection == index
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
                    }
                    .foregroundColor(isSelected ? .white : .palmSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(
                        isSelected
                            ? AnyShapeStyle(LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600], startPoint: .leading, endPoint: .trailing))
                            : AnyShapeStyle(Color.clear)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .shadow(color: isSelected ? PalmGlass.tealShadow : .clear, radius: 8, y: 3)
                }
                .accessibilityLabel("\(title), \(isSelected ? "selected" : "")")
            }
        }
        .padding(4)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.palmGlassBorder, lineWidth: 1))
        .padding(.horizontal, 18)
        .padding(.bottom, 8)
    }
}
