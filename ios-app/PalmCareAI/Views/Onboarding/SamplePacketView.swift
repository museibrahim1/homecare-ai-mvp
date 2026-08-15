import SwiftUI

/// Bundled Eleanor-style completed packet shown once before the paywall.
/// Offline, no PHI, no network. Dramatized sample for first-run wow only.
struct SamplePacketView: View {
    var onDone: () -> Void

    @State private var tab = 0
    private let tabs = ["Overview", "Transcript", "Billables", "Notes", "Contract"]
    private let packet = SamplePacket.load()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                sampleBanner
                tabBar
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        switch tab {
                        case 1: transcriptSection
                        case 2: billablesSection
                        case 3: notesSection
                        case 4: contractSection
                        default: overviewSection
                        }
                    }
                    .padding(18)
                    .padding(.bottom, 24)
                }
            }
            .background(PalmGlassBackground())
            .navigationTitle(packet?.client_name ?? "Sample visit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { onDone() }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.palmPrimary)
                }
            }
        }
    }

    private var sampleBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles")
                .foregroundColor(.palmPrimary)
            VStack(alignment: .leading, spacing: 2) {
                Text("Sample finished visit")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmText)
                Text(packet?.tagline ?? "See what a completed packet looks like.")
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
            }
            Spacer()
        }
        .padding(12)
        .background(Color.palmPrimary.opacity(0.08))
    }

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(Array(tabs.enumerated()), id: \.offset) { index, title in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) { tab = index }
                    } label: {
                        Text(title)
                            .font(.system(size: 12, weight: tab == index ? .bold : .medium))
                            .foregroundColor(tab == index ? .palmPrimary : .palmSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .overlay(alignment: .bottom) {
                                Rectangle()
                                    .fill(tab == index ? Color.palmPrimary : Color.clear)
                                    .frame(height: 2)
                            }
                    }
                }
            }
            .padding(.horizontal, 8)
        }
        .background(Color(UIColor.secondarySystemGroupedBackground))
    }

    private var overviewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("4 of 4 ready")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.palmText)
            Text("\(packet?.client_name ?? "Client") · \(packet?.agency_name ?? "Agency") · \(packet?.state ?? "")")
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                docCard("Transcript", "\(packet?.transcript.count ?? 0) turns", "text.quote")
                docCard("Billables", "\(packet?.billables.count ?? 0) items", "dollarsign.circle")
                docCard("Notes", "SOAP ready", "note.text")
                docCard("Contract", "Ready to send", "doc.text.fill")
            }
        }
    }

    private func docCard(_ title: String, _ value: String, _ icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(.palmPrimary)
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.palmSecondary)
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.palmText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
    }

    private var transcriptSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(Array((packet?.transcript ?? []).enumerated()), id: \.offset) { _, line in
                VStack(alignment: .leading, spacing: 4) {
                    Text(line.speaker)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.palmPrimary)
                    Text(line.text)
                        .font(.system(size: 13))
                        .foregroundColor(.palmText)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(10)
            }
        }
    }

    private var billablesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(Array((packet?.billables ?? []).enumerated()), id: \.offset) { _, item in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.description)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.palmText)
                        Text(item.category)
                            .font(.system(size: 11))
                            .foregroundColor(.palmSecondary)
                    }
                    Spacer()
                    Text("\(item.minutes) min")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.palmPrimary)
                }
                .padding(12)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(10)
            }
        }
    }

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            soap("S", "Subjective", packet?.note.subjective)
            soap("O", "Objective", packet?.note.objective)
            soap("A", "Assessment", packet?.note.assessment)
            soap("P", "Plan", packet?.note.plan)
        }
    }

    private func soap(_ letter: String, _ title: String, _ body: String?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(letter)
                    .font(.system(size: 13, weight: .black))
                    .foregroundColor(.white)
                    .frame(width: 24, height: 24)
                    .background(Color.palmPrimary)
                    .cornerRadius(6)
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmText)
            }
            Text(body ?? "")
                .font(.system(size: 13))
                .foregroundColor(.palmText)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(10)
    }

    private var contractSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(packet?.contract.title ?? "Service Agreement")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.palmText)
            if let rate = packet?.contract.hourly_rate, let hours = packet?.contract.weekly_hours {
                Text("$\(Int(rate))/hr · \(Int(hours)) hrs/week")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.palmPrimary)
            }
            ForEach(packet?.contract.services ?? [], id: \.self) { service in
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.palmGreen)
                    Text(service)
                        .font(.system(size: 13))
                        .foregroundColor(.palmText)
                }
            }
            Text(packet?.contract.terms ?? "")
                .font(.system(size: 12))
                .foregroundColor(.palmSecondary)
                .padding(.top, 4)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}

struct SamplePacket: Codable {
    let client_name: String
    let agency_name: String
    let state: String
    let tagline: String
    let transcript: [SampleLine]
    let billables: [SampleBillable]
    let note: SampleNote
    let contract: SampleContract

    struct SampleLine: Codable {
        let speaker: String
        let text: String
    }
    struct SampleBillable: Codable {
        let code: String
        let category: String
        let description: String
        let minutes: Int
    }
    struct SampleNote: Codable {
        let subjective: String
        let objective: String
        let assessment: String
        let plan: String
    }
    struct SampleContract: Codable {
        let title: String
        let hourly_rate: Double
        let weekly_hours: Double
        let services: [String]
        let terms: String
    }

    static func load() -> SamplePacket? {
        guard let url = Bundle.main.url(forResource: "eleanor_whitfield", withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            return nil
        }
        return try? JSONDecoder().decode(SamplePacket.self, from: data)
    }
}
