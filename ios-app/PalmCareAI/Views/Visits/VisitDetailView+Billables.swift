import SwiftUI

extension VisitDetailView {
    var billablesTab: some View {
        VStack(spacing: 14) {
            if let items = billables?.items, !items.isEmpty {
                let unapprovedCount = items.filter {
                    $0.is_approved != true && !($0.is_flagged == true && !$0.isRecommendation)
                }.count
                let recommendedCount = items.filter { $0.isRecommendation }.count

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Billable Items")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.palmText)
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
                emptyState(icon: "dollarsign.circle", title: "No Billables", message: "Billable items will appear here once the assessment has been processed.")
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
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(isRecommended ? .palmPrimary : .palmSecondary)
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

            if let desc = item.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 13))
                    .foregroundColor(.palmText)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if isRecommended, let reason = item.flag_reason, !reason.isEmpty {
                Text(reason)
                    .font(.system(size: 11))
                    .foregroundColor(.palmSecondary)
            }

            if !isApproved && !isDenied {
                let isPending = pendingBillableIds.contains(item.id)
                HStack(spacing: 10) {
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
        }
        .padding(14)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(borderColor.opacity(isApproved || isDenied || isRecommended ? 0.4 : 0.15), lineWidth: isApproved || isDenied || isRecommended ? 1.5 : 1))
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
