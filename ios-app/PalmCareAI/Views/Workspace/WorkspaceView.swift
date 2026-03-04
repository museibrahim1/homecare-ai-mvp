import SwiftUI

struct WorkspaceView: View {
    @EnvironmentObject var api: APIService
    @State private var selectedSection = 0

    private let sections = ["Calendar", "Documents"]

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
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if selectedSection == 1 {
                        NavigationLink {
                            TemplatesView()
                                .environmentObject(api)
                        } label: {
                            Image(systemName: "doc.badge.gearshape")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.palmPrimary)
                        }
                    }
                }
            }
        }
    }

    private var sectionPicker: some View {
        HStack(spacing: 0) {
            ForEach(Array(sections.enumerated()), id: \.offset) { index, title in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selectedSection = index }
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: index == 0 ? "calendar" : "doc.text.fill")
                            .font(.system(size: 11, weight: .semibold))

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
                if index < sections.count - 1 {
                    Spacer().frame(width: 8)
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 8)
    }
}
