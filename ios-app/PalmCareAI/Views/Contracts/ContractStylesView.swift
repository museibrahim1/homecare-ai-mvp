import SwiftUI

struct ContractStyle: Identifiable {
    let id: String
    let name: String
    let description: String
    let icon: String
    let previewColors: [Color]
    let accentColor: Color
    let layoutType: ContractLayoutType
}

enum ContractLayoutType: String {
    case professional
    case modern
    case classic
    case minimal
    case clinical
    case elegant
}

let builtInContractStyles: [ContractStyle] = [
    ContractStyle(
        id: "professional",
        name: "Professional",
        description: "Clean corporate layout with structured sections and formal headers",
        icon: "building.2.fill",
        previewColors: [Color(hex: "1A5276"), Color(hex: "2E86C1")],
        accentColor: Color(hex: "1A5276"),
        layoutType: .professional
    ),
    ContractStyle(
        id: "modern",
        name: "Modern Care",
        description: "Contemporary design with color accents and rounded cards",
        icon: "sparkles",
        previewColors: [Color.palmPrimary, Color.palmTeal600],
        accentColor: Color.palmPrimary,
        layoutType: .modern
    ),
    ContractStyle(
        id: "classic",
        name: "Classic Legal",
        description: "Traditional legal document style with serif typography",
        icon: "scroll.fill",
        previewColors: [Color(hex: "2C3E50"), Color(hex: "34495E")],
        accentColor: Color(hex: "2C3E50"),
        layoutType: .classic
    ),
    ContractStyle(
        id: "minimal",
        name: "Minimal",
        description: "Simple and clean with lots of whitespace and subtle lines",
        icon: "square.split.2x1.fill",
        previewColors: [Color(hex: "7F8C8D"), Color(hex: "95A5A6")],
        accentColor: Color(hex: "7F8C8D"),
        layoutType: .minimal
    ),
    ContractStyle(
        id: "clinical",
        name: "Clinical",
        description: "Healthcare-focused with medical iconography and structured data",
        icon: "cross.case.fill",
        previewColors: [Color(hex: "27AE60"), Color(hex: "2ECC71")],
        accentColor: Color(hex: "27AE60"),
        layoutType: .clinical
    ),
    ContractStyle(
        id: "elegant",
        name: "Elegant",
        description: "Premium feel with gradient accents and refined typography",
        icon: "crown.fill",
        previewColors: [Color(hex: "8E44AD"), Color(hex: "9B59B6")],
        accentColor: Color(hex: "8E44AD"),
        layoutType: .elegant
    ),
]

// MARK: - Styles Gallery View

struct ContractStylesView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedStyleId: String
    let contractTitle: String?

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16) {
                    headerText

                    LazyVGrid(columns: columns, spacing: 14) {
                        ForEach(builtInContractStyles) { style in
                            styleCard(style)
                        }
                    }
                    .padding(.horizontal, 18)
                }
                .padding(.bottom, 40)
            }
            .background(Color.palmBackground)
            .navigationTitle("Contract Styles")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.palmPrimary)
                }
            }
        }
    }

    private var headerText: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Choose a style for your contract")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.palmText)
            Text("Same data, different look. Switch styles anytime.")
                .font(.system(size: 12))
                .foregroundColor(.palmSecondary)
        }
        .padding(.horizontal, 18)
        .padding(.top, 8)
    }

    private func styleCard(_ style: ContractStyle) -> some View {
        let isSelected = selectedStyleId == style.id
        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedStyleId = style.id
            }
        } label: {
            VStack(spacing: 0) {
                stylePreview(style)
                    .frame(height: 150)
                    .clipped()

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(style.name)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.palmText)
                        Spacer()
                        if isSelected {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 14))
                                .foregroundColor(.palmPrimary)
                        }
                    }
                    Text(style.description)
                        .font(.system(size: 10))
                        .foregroundColor(.palmSecondary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(10)
            }
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.palmPrimary : Color.palmBorder, lineWidth: isSelected ? 2 : 1)
            )
            .shadow(color: isSelected ? Color.palmPrimary.opacity(0.15) : .black.opacity(0.03), radius: isSelected ? 6 : 3, y: 2)
        }
    }

    @ViewBuilder
    private func stylePreview(_ style: ContractStyle) -> some View {
        let title = contractTitle ?? "Service Agreement"
        switch style.layoutType {
        case .professional:
            professionalPreview(title: title, colors: style.previewColors)
        case .modern:
            modernPreview(title: title, colors: style.previewColors)
        case .classic:
            classicPreview(title: title, colors: style.previewColors)
        case .minimal:
            minimalPreview(title: title, colors: style.previewColors)
        case .clinical:
            clinicalPreview(title: title, colors: style.previewColors)
        case .elegant:
            elegantPreview(title: title, colors: style.previewColors)
        }
    }

    // MARK: - Preview Renderers

    private func professionalPreview(title: String, colors: [Color]) -> some View {
        VStack(spacing: 0) {
            Rectangle().fill(LinearGradient(colors: colors, startPoint: .leading, endPoint: .trailing))
                .frame(height: 32)
                .overlay(
                    Text(title).font(.system(size: 7, weight: .bold)).foregroundColor(.white)
                        .lineLimit(1).padding(.horizontal, 8),
                    alignment: .leading
                )

            VStack(alignment: .leading, spacing: 5) {
                fakeTextLine(width: 0.7, color: colors[0])
                fakeTextLine(width: 0.9, color: .gray.opacity(0.2))
                fakeTextLine(width: 0.5, color: .gray.opacity(0.2))
                Divider()
                HStack(spacing: 4) {
                    fakeBlock(color: colors[0].opacity(0.1))
                    fakeBlock(color: colors[0].opacity(0.1))
                    fakeBlock(color: colors[0].opacity(0.1))
                }
                fakeTextLine(width: 0.8, color: .gray.opacity(0.15))
                fakeTextLine(width: 0.6, color: .gray.opacity(0.15))
                Divider()
                fakeTextLine(width: 0.4, color: colors[0])
                fakeTextLine(width: 1.0, color: .gray.opacity(0.15))
                fakeTextLine(width: 0.75, color: .gray.opacity(0.15))
            }
            .padding(8)
            .background(Color.white)
        }
    }

    private func modernPreview(title: String, colors: [Color]) -> some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(size: 7, weight: .bold)).foregroundColor(colors[0]).lineLimit(1)
                fakeTextLine(width: 0.5, color: .gray.opacity(0.15))
            }
            .padding(8)

            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(colors[0].opacity(0.08))
                        .frame(height: 22)
                        .overlay(fakeTextLine(width: 0.6, color: colors[0].opacity(0.4)).padding(3))
                }
            }
            .padding(.horizontal, 8)

            VStack(alignment: .leading, spacing: 4) {
                ForEach(0..<3, id: \.self) { _ in
                    HStack(spacing: 4) {
                        Circle().fill(colors[0].opacity(0.2)).frame(width: 10, height: 10)
                        fakeTextLine(width: 0.7, color: .gray.opacity(0.15))
                    }
                }
            }
            .padding(8)

            Spacer()
        }
        .background(Color.white)
    }

    private func classicPreview(title: String, colors: [Color]) -> some View {
        VStack(spacing: 0) {
            Rectangle().fill(colors[0]).frame(height: 2)
            VStack(spacing: 4) {
                Text(title).font(.system(size: 8, weight: .heavy, design: .serif)).foregroundColor(colors[0]).lineLimit(1)
                Rectangle().fill(colors[0]).frame(height: 0.5)
                fakeTextLine(width: 0.6, color: .gray.opacity(0.2))
            }
            .padding(.horizontal, 8)
            .padding(.top, 8)

            VStack(alignment: .leading, spacing: 3) {
                fakeTextLine(width: 1.0, color: .gray.opacity(0.12))
                fakeTextLine(width: 0.9, color: .gray.opacity(0.12))
                fakeTextLine(width: 0.85, color: .gray.opacity(0.12))
                Spacer().frame(height: 4)
                fakeTextLine(width: 0.5, color: colors[0].opacity(0.6))
                fakeTextLine(width: 1.0, color: .gray.opacity(0.12))
                fakeTextLine(width: 0.7, color: .gray.opacity(0.12))
                Spacer().frame(height: 4)
                fakeTextLine(width: 0.4, color: colors[0].opacity(0.6))
                fakeTextLine(width: 0.95, color: .gray.opacity(0.12))
            }
            .padding(8)
            Spacer()
        }
        .background(Color(hex: "FDFCFA"))
    }

    private func minimalPreview(title: String, colors: [Color]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Spacer().frame(height: 12)
            Text(title).font(.system(size: 8, weight: .medium)).foregroundColor(.black.opacity(0.7)).lineLimit(1)
                .padding(.horizontal, 12)
            Spacer().frame(height: 6)
            Rectangle().fill(Color.gray.opacity(0.15)).frame(height: 0.5).padding(.horizontal, 12)
            Spacer().frame(height: 8)

            VStack(alignment: .leading, spacing: 6) {
                fakeTextLine(width: 0.8, color: .gray.opacity(0.1))
                fakeTextLine(width: 0.6, color: .gray.opacity(0.1))
                Spacer().frame(height: 6)
                fakeTextLine(width: 0.3, color: .black.opacity(0.5))
                fakeTextLine(width: 0.9, color: .gray.opacity(0.1))
                fakeTextLine(width: 0.7, color: .gray.opacity(0.1))
                Spacer().frame(height: 6)
                fakeTextLine(width: 0.35, color: .black.opacity(0.5))
                fakeTextLine(width: 0.85, color: .gray.opacity(0.1))
            }
            .padding(.horizontal, 12)
            Spacer()
        }
        .background(Color.white)
    }

    private func clinicalPreview(title: String, colors: [Color]) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                Image(systemName: "cross.case.fill").font(.system(size: 6)).foregroundColor(colors[0])
                Text(title).font(.system(size: 6, weight: .bold)).foregroundColor(colors[0]).lineLimit(1)
                Spacer()
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(colors[0].opacity(0.06))

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 2).fill(colors[0].opacity(0.12)).frame(width: 50, height: 20)
                    RoundedRectangle(cornerRadius: 2).fill(colors[0].opacity(0.12)).frame(height: 20)
                }
                ForEach(0..<4, id: \.self) { _ in
                    HStack(spacing: 3) {
                        Circle().fill(colors[0].opacity(0.3)).frame(width: 6, height: 6)
                        fakeTextLine(width: 0.5, color: .gray.opacity(0.15))
                        Spacer()
                        fakeTextLine(width: 0.2, color: colors[0].opacity(0.25))
                    }
                }
                Divider()
                fakeTextLine(width: 0.5, color: colors[0].opacity(0.4))
                fakeTextLine(width: 0.8, color: .gray.opacity(0.12))
            }
            .padding(8)
            Spacer()
        }
        .background(Color.white)
    }

    private func elegantPreview(title: String, colors: [Color]) -> some View {
        ZStack(alignment: .topLeading) {
            LinearGradient(colors: [colors[0].opacity(0.03), colors[0].opacity(0.08)],
                          startPoint: .topLeading, endPoint: .bottomTrailing)

            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Spacer()
                    VStack(spacing: 2) {
                        Text(title).font(.system(size: 7, weight: .bold, design: .serif)).foregroundColor(colors[0]).lineLimit(1)
                        Rectangle().fill(LinearGradient(colors: colors, startPoint: .leading, endPoint: .trailing))
                            .frame(width: 40, height: 1.5)
                    }
                    Spacer()
                }
                .padding(.top, 14)

                VStack(alignment: .leading, spacing: 4) {
                    fakeTextLine(width: 0.4, color: colors[0].opacity(0.5))
                    fakeTextLine(width: 0.9, color: .gray.opacity(0.12))
                    fakeTextLine(width: 0.7, color: .gray.opacity(0.12))
                    Spacer().frame(height: 4)

                    RoundedRectangle(cornerRadius: 4)
                        .stroke(colors[0].opacity(0.15), lineWidth: 0.5)
                        .frame(height: 30)
                        .overlay(
                            VStack(spacing: 2) {
                                fakeTextLine(width: 0.6, color: .gray.opacity(0.1))
                                fakeTextLine(width: 0.5, color: .gray.opacity(0.1))
                            }.padding(4)
                        )

                    fakeTextLine(width: 0.4, color: colors[0].opacity(0.5))
                    fakeTextLine(width: 0.85, color: .gray.opacity(0.12))
                }
                .padding(8)
                Spacer()
            }
        }
    }

    // MARK: - Helpers

    private func fakeTextLine(width: CGFloat, color: Color) -> some View {
        GeometryReader { geo in
            RoundedRectangle(cornerRadius: 1)
                .fill(color)
                .frame(width: geo.size.width * width, height: 3)
        }
        .frame(height: 3)
    }

    private func fakeBlock(color: Color) -> some View {
        RoundedRectangle(cornerRadius: 3)
            .fill(color)
            .frame(height: 18)
    }
}

// MARK: - Color hex init

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}
