import SwiftUI

extension VisitDetailView {
    var billablesTab: some View {
        VStack(spacing: 14) {
            if let items = billables?.items, !items.isEmpty {
                let unapprovedCount = items.filter {
                    $0.is_approved != true && !($0.is_flagged == true && !$0.isRecommendation)
                }.count
                let recommendedCount = items.filter { $0.isRecommendation }.count

                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 4) {
                        PalmGlassLabel(text: "Billable Items")
                        Text(
                            recommendedCount > 0
                                ? "\(items.count) items · \(recommendedCount) recommended from assessment"
                                : "\(items.count) items identified"
                        )
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
                documentEmptyState(
                    step: "billing",
                    icon: "dollarsign.circle",
                    title: "No Billables",
                    waitingMessage: "Billable items will appear here once the assessment has been processed."
                )
            }
        }
    }

    func billableRow(_ item: BillableItem, index: Int) -> some View {
        let isApproved = item.is_approved == true
        let isDenied = item.is_flagged == true && !item.isRecommendation
        let isRecommended = item.isRecommendation && !isDenied && !isApproved
        let borderColor: Color = isApproved
            ? .palmGreen
            : (isDenied ? .red : (isRecommended ? .palmPrimary : Color.palmBorder))

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
                Text(item.timeLabel)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.palmPrimary)
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

            if let desc = item.description, !desc.isEmpty, editingBillableId != item.id {
                Text(desc)
                    .font(.system(size: 13))
                    .foregroundColor(.palmText)
                    .lineLimit(3)
                    .truncationMode(.tail)
            }

            if editingBillableId == item.id {
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
            }

            if isRecommended, let reason = item.flag_reason, !reason.isEmpty {
                Text(reason)
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
            }

            if !isApproved && !isDenied {
                let isPending = pendingBillableIds.contains(item.id)
                HStack(spacing: 10) {
                    if editingBillableId != item.id {
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
                    }

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
                    .disabled(isPending || editingBillableId == item.id)

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
                    .disabled(isPending || editingBillableId == item.id)
                }
            }
        }
        .padding(14)
        .palmGlassCard(radius: 18)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(borderColor.opacity(isApproved || isDenied || isRecommended ? 0.5 : 0), lineWidth: isApproved || isDenied || isRecommended ? 1.5 : 0))
    }

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

    // MARK: - Notes Tab (SOAP)

}
