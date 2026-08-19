import SwiftUI

extension VisitDetailView {
    // MARK: - Billables Tab (Paper Pipeline Glass → Billables)

    /// Slate body ink from the Paper design (#1E293B). Shared with the Notes tab.
    var paperInkColor: Color {
        Color(red: 30 / 255, green: 41 / 255, blue: 59 / 255)
    }

    var billablesTab: some View {
        VStack(spacing: 0) {
            if let items = billables?.items, !items.isEmpty {
                let unapprovedCount = items.filter {
                    $0.is_approved != true && !($0.is_flagged == true && !$0.isRecommendation)
                }.count

                VStack(spacing: 0) {
                    VStack(alignment: .leading, spacing: 14) {
                        billablesSheetHeader(items: items)

                        ForEach(Array(items.enumerated()), id: \.element.id) { idx, item in
                            billableLine(item, index: idx)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 20)
                    .padding(.bottom, 16)

                    billablesApproveCTA(unapprovedCount: unapprovedCount)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 18)
                }
                .palmGlassCard(radius: 28, fillOpacity: 0.62)
            } else if tabFetchFailed.contains("billables") {
                tabErrorState(tab: "billables")
            } else {
                documentEmptyState(
                    step: "billing",
                    icon: "dollarsign.circle",
                    title: "No Billables",
                    waitingMessage: "Billable items will appear here once the assessment has been processed."
                )
            }
        }
    }

    // MARK: - Sheet header (WEEKLY HOURS / rate)

    @ViewBuilder
    func billablesSheetHeader(items: [BillableItem]) -> some View {
        let recommendedCount = items.filter { $0.isRecommendation }.count
        let summary = recommendedCount > 0
            ? "\(items.count) items · \(recommendedCount) recommended from the assessment"
            : "\(items.count) billable items identified"

        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    if let hours = contract?.weekly_hours, hours > 0 {
                        Text("WEEKLY HOURS")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(0.8)
                            .foregroundColor(.palmPrimary)
                        Text("\(Int(hours.rounded())) hours")
                            .font(.system(size: 22, weight: .bold))
                            .tracking(-0.4)
                            .foregroundColor(.palmText)
                    } else {
                        Text("BILLABLE ITEMS")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(0.8)
                            .foregroundColor(.palmPrimary)
                        Text("\(items.count) items")
                            .font(.system(size: 22, weight: .bold))
                            .tracking(-0.4)
                            .foregroundColor(.palmText)
                    }
                }

                Spacer()

                if let rate = contract?.hourly_rate, rate > 0 {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(Int(rate.rounded())) / hr")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.palmSecondary)
                        if let hours = contract?.weekly_hours, hours > 0 {
                            Text("$\(Int((rate * hours).rounded())) / wk")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.palmPrimary)
                        }
                    }
                }
            }

            Text(summary)
                .font(.system(size: 13))
                .foregroundColor(.palmSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    // MARK: - Service line item

    func billableLine(_ item: BillableItem, index: Int) -> some View {
        let isApproved = item.is_approved == true
        let isDenied = item.is_flagged == true && !item.isRecommendation
        let isRecommended = item.isRecommendation && !isDenied && !isApproved
        let title = billableTitle(item)

        return VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .tracking(-0.15)
                    .foregroundColor(.palmText)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 12)
                if let amount = billableAmount(item) {
                    Text(amount)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.palmPrimary)
                }
            }

            if let desc = item.description, !desc.isEmpty, editingBillableId != item.id {
                Text(desc)
                    .font(.system(size: 13))
                    .foregroundColor(paperInkColor)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 8) {
                Text(billableFooter(item))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.palmSecondary)
                Spacer()
                if isApproved {
                    Label("Approved", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmGreen)
                } else if isDenied {
                    Label("Denied", systemImage: "xmark.circle.fill")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.red)
                } else if isRecommended {
                    Label("Recommended", systemImage: "list.clipboard")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.palmPrimary)
                }
            }

            if isRecommended, let reason = item.flag_reason, !reason.isEmpty {
                Text(reason)
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if editingBillableId == item.id {
                billableEditFields(item, index: index)
            } else if !isApproved && !isDenied {
                billableActionButtons(item, index: index)
                    .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, index == 0 ? 12 : 12)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Color.palmText.opacity(0.08))
                .frame(height: 1)
        }
    }

    // MARK: - Inline edit + actions

    @ViewBuilder
    func billableEditFields(_ item: BillableItem, index: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Edit before approve")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.palmSecondary)
            TextField("Description", text: $editBillableDescription, axis: .vertical)
                .font(.system(size: 13))
                .lineLimit(2...5)
                .padding(10)
                .background(Color.white.opacity(0.75))
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmGlassBorder, lineWidth: 1))
            HStack {
                Text("Minutes")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.palmSecondary)
                TextField("0", text: $editBillableMinutes)
                    .keyboardType(.numberPad)
                    .font(.system(size: 13, weight: .semibold))
                    .frame(width: 64)
                    .padding(8)
                    .background(Color.white.opacity(0.75))
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmGlassBorder, lineWidth: 1))
                Spacer()
            }
            HStack(spacing: 10) {
                Button {
                    Task { await saveBillableEdit(item, index: index) }
                } label: {
                    HStack(spacing: 4) {
                        if isSavingBillableEdit {
                            ProgressView().scaleEffect(0.6).tint(.white)
                        }
                        Text("Save")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.palmPrimary.opacity(isSavingBillableEdit ? 0.6 : 1))
                    .cornerRadius(8)
                }
                .disabled(isSavingBillableEdit)
                Button {
                    editingBillableId = nil
                } label: {
                    Text("Cancel")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.palmSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.palmSecondary.opacity(0.1))
                        .cornerRadius(8)
                }
                .disabled(isSavingBillableEdit)
            }
        }
        .padding(.top, 4)
    }

    @ViewBuilder
    func billableActionButtons(_ item: BillableItem, index: Int) -> some View {
        let isPending = pendingBillableIds.contains(item.id)
        HStack(spacing: 10) {
            Button {
                beginBillableEdit(item)
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "pencil")
                        .font(.system(size: 11, weight: .bold))
                    Text("Edit")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(.palmPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Color.palmPrimary.opacity(0.08))
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.palmPrimary.opacity(0.25), lineWidth: 1))
            }
            .disabled(isPending || isSavingBillableEdit)

            Button {
                Task { await approveBillable(item, index: index) }
            } label: {
                HStack(spacing: 4) {
                    if isPending {
                        ProgressView().scaleEffect(0.6).tint(.white)
                    } else {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                    }
                    Text("Approve")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Color.palmGreen.opacity(isPending ? 0.6 : 1))
                .cornerRadius(8)
            }
            .disabled(isPending)

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
            .disabled(isPending)
        }
    }

    // MARK: - Approve CTA

    @ViewBuilder
    func billablesApproveCTA(unapprovedCount: Int) -> some View {
        if unapprovedCount > 0 {
            Button {
                Task { await approveAllBillables() }
            } label: {
                Text(unapprovedCount == 1 ? "Approve billable" : "Approve billables")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Capsule(style: .continuous).fill(Color.palmPrimary))
                    .shadow(color: PalmGlass.tealShadow, radius: 14, y: 8)
            }
            .accessibilityLabel("Approve all billable items")
        } else {
            HStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 14, weight: .semibold))
                Text("Billables approved")
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundColor(.palmGreen)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(Capsule(style: .continuous).fill(Color.palmGreen.opacity(0.1)))
        }
    }

    // MARK: - Display helpers

    func billableTitle(_ item: BillableItem) -> String {
        if let cat = item.category, !cat.isEmpty {
            return cat.replacingOccurrences(of: "_", with: " ").capitalized
        }
        if let code = item.code, !code.isEmpty {
            return code
        }
        return "Service"
    }

    /// Weekly-rate dollar figure for a line item, only when the contract has an
    /// hourly rate to multiply against. Never shown for assessment recommendations.
    func billableAmount(_ item: BillableItem) -> String? {
        guard !item.isRecommendation, let rate = contract?.hourly_rate, rate > 0 else { return nil }
        let mins = item.adjusted_minutes ?? item.minutes ?? 0
        guard mins > 0 else { return nil }
        return "$\(Int((mins / 60 * rate).rounded()))"
    }

    func billableFooter(_ item: BillableItem) -> String {
        item.timeLabel
    }

    // MARK: - API wiring (unchanged)

    func beginBillableEdit(_ item: BillableItem) {
        editingBillableId = item.id
        editBillableDescription = item.description ?? ""
        let mins = item.adjusted_minutes ?? item.minutes ?? 0
        editBillableMinutes = "\(Int(mins))"
    }

    func saveBillableEdit(_ item: BillableItem, index: Int) async {
        guard !isSavingBillableEdit else { return }
        await MainActor.run { isSavingBillableEdit = true }
        defer { Task { @MainActor in isSavingBillableEdit = false } }
        let minutes = Int(editBillableMinutes.trimmingCharacters(in: .whitespaces))
        do {
            let updated = try await api.updateBillableItem(
                visitId: visitId,
                itemId: item.id,
                description: editBillableDescription,
                adjustedMinutes: minutes,
                adjustmentReason: minutes == nil ? nil : "Edited before approve"
            )
            await MainActor.run {
                guard var items = billables?.items, items.indices.contains(index) else { return }
                items[index] = updated
                billables = VisitBillablesResponse(
                    items: items,
                    total_minutes: billables?.total_minutes,
                    total_adjusted_minutes: billables?.total_adjusted_minutes,
                    categories: billables?.categories
                )
                editingBillableId = nil
            }
            PostHogService.shared.capture("billable_edited")
        } catch {
            await MainActor.run {
                actionError = "Could not save billable: \(error.palmFriendlyMessage)"
                showActionError = true
            }
        }
    }

    func approveBillable(_ item: BillableItem, index: Int) async {
        guard !pendingBillableIds.contains(item.id) else { return }
        await MainActor.run { _ = pendingBillableIds.insert(item.id) }
        defer { Task { @MainActor in pendingBillableIds.remove(item.id) } }
        do {
            let _ = try await api.approveBillableItem(visitId: visitId, itemId: item.id)
            await MainActor.run {
                if var items = billables?.items {
                    items[index] = BillableItem(id: item.id, visit_id: item.visit_id, code: item.code, category: item.category, description: item.description, start_ms: item.start_ms, end_ms: item.end_ms, minutes: item.minutes, evidence: item.evidence, is_approved: true, is_flagged: false, flag_reason: item.flag_reason, adjusted_minutes: item.adjusted_minutes)
                    billables = VisitBillablesResponse(items: items, total_minutes: billables?.total_minutes, total_adjusted_minutes: billables?.total_adjusted_minutes, categories: billables?.categories)
                }
            }
        } catch {
            await MainActor.run {
                actionError = "Could not approve billable. \(error.localizedDescription)"
                showActionError = true
            }
        }
    }

    func denyBillable(_ item: BillableItem, index: Int) async {
        guard !pendingBillableIds.contains(item.id) else { return }
        await MainActor.run { _ = pendingBillableIds.insert(item.id) }
        defer { Task { @MainActor in pendingBillableIds.remove(item.id) } }
        do {
            let _ = try await api.denyBillableItem(visitId: visitId, itemId: item.id)
            await MainActor.run {
                if var items = billables?.items {
                    items[index] = BillableItem(id: item.id, visit_id: item.visit_id, code: item.code, category: item.category, description: item.description, start_ms: item.start_ms, end_ms: item.end_ms, minutes: item.minutes, evidence: item.evidence, is_approved: false, is_flagged: true, flag_reason: item.flag_reason, adjusted_minutes: item.adjusted_minutes)
                    billables = VisitBillablesResponse(items: items, total_minutes: billables?.total_minutes, total_adjusted_minutes: billables?.total_adjusted_minutes, categories: billables?.categories)
                }
            }
        } catch {
            await MainActor.run {
                actionError = "Could not deny billable. \(error.localizedDescription)"
                showActionError = true
            }
        }
    }

    func approveAllBillables() async {
        guard let items = billables?.items else { return }
        for (idx, item) in items.enumerated()
            where item.is_approved != true && !(item.is_flagged == true && !item.isRecommendation)
        {
            await approveBillable(item, index: idx)
        }
    }
}
