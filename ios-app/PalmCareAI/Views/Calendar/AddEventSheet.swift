import SwiftUI

// MARK: - Add Event Sheet

struct AddEventSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (CalendarEvent) -> Void

    @State private var title = ""
    @State private var description = ""
    @State private var startTime = Date()
    @State private var endTime = Date().addingTimeInterval(3600)
    @State private var location = ""
    @State private var selectedColor = 0

    private let colorOptions: [(String, Color)] = [
        ("Teal", .palmPrimary),
        ("Blue", .palmBlue),
        ("Orange", .palmOrange),
        ("Purple", .palmPurple),
        ("Green", .palmGreen)
    ]

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty && endTime > startTime
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerIcon

                    VStack(spacing: 16) {
                        eventField(label: "Event Name", required: true) {
                            TextField("Team standup, Client visit...", text: $title)
                                .font(.system(size: 14))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                        }

                        eventField(label: "Description") {
                            TextField("Add details...", text: $description, axis: .vertical)
                                .font(.system(size: 14))
                                .lineLimit(2...4)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .background(Color(UIColor.secondarySystemGroupedBackground))
                                .cornerRadius(10)
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                        }

                        eventField(label: "Location") {
                            HStack(spacing: 8) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.system(size: 16))
                                    .foregroundColor(.palmSecondary)
                                TextField("Office, Zoom, Client home...", text: $location)
                                    .font(.system(size: 14))
                                    .textContentType(.fullStreetAddress)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color(UIColor.secondarySystemGroupedBackground))
                            .cornerRadius(10)
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.palmBorder, lineWidth: 1))
                        }

                        timeSection

                        colorPicker
                    }
                    .padding(.horizontal, 20)

                    saveButton
                        .padding(.horizontal, 20)
                        .padding(.bottom, 30)
                }
                .padding(.top, 16)
            }
            .background(Color.palmBackground)
            .navigationTitle("New Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.palmSecondary)
                }
            }
        }
    }

    private var headerIcon: some View {
        VStack(spacing: 4) {
            Circle()
                .fill(
                    LinearGradient(colors: [Color.palmPrimary, Color.palmAccent],
                                   startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .frame(width: 56, height: 56)
                .overlay(
                    Image(systemName: "calendar.badge.plus")
                        .font(.system(size: 22))
                        .foregroundColor(.white)
                )

            Text("New Event")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.palmText)
        }
    }

    private var timeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Time")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.palmSecondary)

            VStack(spacing: 0) {
                HStack {
                    Image(systemName: "clock")
                        .font(.system(size: 14))
                        .foregroundColor(.palmPrimary)
                        .frame(width: 28)
                    Text("Start")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.palmText)
                    Spacer()
                    DatePicker("", selection: $startTime)
                        .labelsHidden()
                        .tint(.palmPrimary)
                        .onChange(of: startTime) { newStart in
                            // Keep the range valid: moving start past end
                            // drags end along (1h default duration).
                            if endTime <= newStart {
                                endTime = newStart.addingTimeInterval(3600)
                            }
                        }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)

                Rectangle()
                    .fill(Color.palmBorder.opacity(0.5))
                    .frame(height: 1)
                    .padding(.leading, 56)

                HStack {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.palmOrange)
                        .frame(width: 28)
                    Text("End")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.palmText)
                    Spacer()
                    DatePicker("", selection: $endTime)
                        .labelsHidden()
                        .tint(.palmPrimary)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(12)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.palmBorder, lineWidth: 1))
        }
    }

    private var colorPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Color")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.palmSecondary)

            HStack(spacing: 10) {
                ForEach(Array(colorOptions.enumerated()), id: \.offset) { index, option in
                    Button {
                        selectedColor = index
                    } label: {
                        Circle()
                            .fill(option.1)
                            .frame(width: 32, height: 32)
                            .overlay(
                                Circle()
                                    .stroke(Color.white, lineWidth: selectedColor == index ? 2 : 0)
                            )
                            .overlay(
                                Circle()
                                    .stroke(option.1, lineWidth: selectedColor == index ? 2 : 0)
                                    .padding(-3)
                            )
                            .overlay(
                                selectedColor == index
                                    ? Image(systemName: "checkmark")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                    : nil
                            )
                    }
                }
                Spacer()
            }
        }
    }

    private var saveButton: some View {
        Button {
            let event = CalendarEvent(
                title: title.trimmingCharacters(in: .whitespaces),
                description: description.isEmpty ? nil : description,
                startDate: startTime,
                endDate: endTime,
                location: location.isEmpty ? nil : location
            )
            onSave(event)
            dismiss()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "calendar.badge.plus")
                    .font(.system(size: 14, weight: .bold))
                Text("Add Event")
                    .font(.system(size: 15, weight: .bold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(colors: [Color.palmPrimary, Color.palmTeal600],
                               startPoint: .leading, endPoint: .trailing)
                .opacity(canSave ? 1 : 0.5)
            )
            .cornerRadius(12)
        }
        .disabled(!canSave)
    }

    @ViewBuilder
    private func eventField<Content: View>(label: String, required: Bool = false, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.palmSecondary)
                if required {
                    Text("*")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.red)
                }
            }
            content()
        }
    }
}
