import SwiftUI

extension VisitDetailView {
    func loadVisit() async {
        isLoading = true
        errorMessage = nil
        do {
            let v = try await api.fetchVisit(id: visitId)
            await MainActor.run {
                visit = v
                isLoading = false
            }
            await loadTabDataIfNeeded()
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }

    func loadTabDataIfNeeded() async {
        if activeTabId == "overview" {
            await loadAllTabData()
            return
        }

        switch activeTabId {
        case "transcript":
            await loadTranscript()
        case "billables":
            await loadBillables()
        case "notes":
            await loadNote()
        case "care_plan":
            await loadCarePlan()
        case "contract":
            await loadContract()
        default:
            break
        }
    }

    func loadAllTabData() async {
        async let t: () = loadTranscript()
        async let b: () = loadBillables()
        async let n: () = loadNote()
        async let c: () = loadContract()
        async let p: () = loadCarePlan()
        _ = await (t, b, n, c, p)
    }

    func loadTranscript() async {
        guard transcript == nil else { return }
        do {
            let t = try await api.fetchVisitTranscript(visitId: visitId)
            await MainActor.run { transcript = t; tabFetchFailed.remove("transcript") }
        } catch {
            // While the pipeline is still running, a missing result isn't an
            // error — show the friendly "processing" state, not "Failed to Load".
            await MainActor.run { if !isPipelineProcessing { _ = tabFetchFailed.insert("transcript") } }
        }
    }

    func loadBillables() async {
        guard billables == nil else { return }
        do {
            let b = try await api.fetchVisitBillables(visitId: visitId)
            await MainActor.run {
                billables = b
                tabFetchFailed.remove("billables")
                clampActiveTabToVisible()
            }
        } catch {
            await MainActor.run { if !isPipelineProcessing { _ = tabFetchFailed.insert("billables") } }
        }
    }

    func loadNote() async {
        guard note == nil else { return }
        do {
            let n = try await api.fetchVisitNote(visitId: visitId)
            await MainActor.run { note = n; tabFetchFailed.remove("notes") }
        } catch {
            await MainActor.run { if !isPipelineProcessing { _ = tabFetchFailed.insert("notes") } }
        }
    }

    func loadContract() async {
        guard contract == nil else { return }
        do {
            let c = try await api.fetchVisitContract(visitId: visitId)
            await MainActor.run { contract = c; tabFetchFailed.remove("contract") }
            // Care plan is written with the contract. Refresh client text after.
            await loadCarePlan(force: true)
        } catch {
            await MainActor.run { if !isPipelineProcessing { _ = tabFetchFailed.insert("contract") } }
        }
    }

    func loadCarePlan(force: Bool = false) async {
        if !force {
            let alreadyLoaded = await MainActor.run {
                carePlanText != nil || hasCarePlanContent
            }
            if alreadyLoaded { return }
        }

        if let existing = visit?.client?.care_plan?.trimmingCharacters(in: .whitespacesAndNewlines),
           !existing.isEmpty {
            await MainActor.run {
                carePlanText = existing
                tabFetchFailed.remove("care_plan")
            }
            return
        }

        let clientId = await MainActor.run { visit?.client_id }
        guard let clientId else {
            await MainActor.run {
                if hasCarePlanContent {
                    tabFetchFailed.remove("care_plan")
                } else if !isPipelineProcessing {
                    _ = tabFetchFailed.insert("care_plan")
                }
            }
            return
        }

        do {
            let client = try await api.fetchClient(id: clientId)
            await MainActor.run {
                let plan = client.care_plan?.trimmingCharacters(in: .whitespacesAndNewlines)
                if let plan, !plan.isEmpty {
                    carePlanText = plan
                }
                if hasCarePlanContent {
                    tabFetchFailed.remove("care_plan")
                } else if !isPipelineProcessing {
                    _ = tabFetchFailed.insert("care_plan")
                }
            }
        } catch {
            await MainActor.run {
                if hasCarePlanContent {
                    tabFetchFailed.remove("care_plan")
                } else if !isPipelineProcessing {
                    _ = tabFetchFailed.insert("care_plan")
                }
            }
        }
    }

    // MARK: - Live Pipeline Refresh

    /// True while any core pipeline step is still pending/processing. Drives
    /// both the auto-refresh loop and the per-tab "processing" placeholder.
    var isPipelineProcessing: Bool {
        guard let ps = visit?.pipeline_state else { return false }
        for step in ["transcription", "billing", "note", "contract"] {
            guard let stepData = ps[step]?.value as? [String: Any],
                  let status = stepData["status"] as? String else {
                // A core step entry hasn't been written yet → still spinning up.
                return true
            }
            switch status.lowercased() {
            case "pending", "processing", "running", "queued":
                return true
            default:
                continue
            }
        }
        return false
    }

    /// Re-fetch the visit and any not-yet-loaded results while the pipeline
    /// runs, so the screen fills in automatically without manual retries.
    func pollPipelineUntilComplete() async {
        var attempts = 0
        let maxAttempts = 100 // ~5 min at 3s intervals
        while attempts < maxAttempts && !Task.isCancelled {
            guard isPipelineProcessing else {
                // Final sweep to load anything that just finished.
                await loadTabDataIfNeeded()
                return
            }
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            attempts += 1
            if Task.isCancelled { return }

            if let v = try? await api.fetchVisit(id: visitId) {
                await MainActor.run { visit = v }
            }
            // Allow failed/empty tabs to retry as results become available.
            await MainActor.run { tabFetchFailed.removeAll() }
            await loadTabDataIfNeeded()
        }
    }

    func exportFile(type: String) async {
        PostHogService.shared.capture("visit_export_started", properties: [
            "type": type,
        ])
        do {
            let localURL = try await api.downloadFile(
                path: "/exports/visits/\(visitId)/\(type)",
                suggestedFilename: "\(clientName ?? "visit")_\(type)"
            )
            await MainActor.run {
                let activityVC = UIActivityViewController(activityItems: [localURL], applicationActivities: nil)
                guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                      let window = windowScene.windows.first(where: { $0.isKeyWindow }) ?? windowScene.windows.first,
                      let rootVC = window.rootViewController else { return }

                // iPad requires a popover anchor or the share sheet crashes.
                // Center the popover on the screen since the trigger button
                // (toolbar Menu item) doesn't give us a stable source view.
                if let popover = activityVC.popoverPresentationController {
                    popover.sourceView = window
                    popover.sourceRect = CGRect(
                        x: window.bounds.midX,
                        y: window.bounds.midY,
                        width: 0,
                        height: 0
                    )
                    popover.permittedArrowDirections = []
                }

                var topVC: UIViewController = rootVC
                while let presented = topVC.presentedViewController {
                    topVC = presented
                }
                topVC.present(activityVC, animated: true)
            }
            PostHogService.shared.capture("visit_export_succeeded", properties: [
                "type": type,
            ])
        } catch {
            PostHogService.shared.capture("visit_export_failed", properties: [
                "type": type,
            ])
            await MainActor.run {
                actionError = "Export failed: \(error.localizedDescription)"
                showActionError = true
            }
        }
    }

    func restartAssessment() async {
        PostHogService.shared.capture("assessment_restart_started")
        do {
            try await api.restartVisit(visitId: visitId)
            let v = try await api.fetchVisit(id: visitId)
            await MainActor.run {
                visit = v
                transcript = nil
                billables = nil
                note = nil
                contract = nil
                carePlanText = nil
                tabFetchFailed = []
            }
            // The pipeline is running again — resume the auto-refresh loop so
            // the processing banner clears and tabs fill in on their own.
            await pollPipelineUntilComplete()
            PostHogService.shared.capture("assessment_restart_succeeded")
        } catch {
            PostHogService.shared.capture("assessment_restart_failed")
            await MainActor.run {
                actionError = "Restart failed: \(error.localizedDescription)"
                showActionError = true
            }
        }
    }

    /// Re-queue one failed/stuck document without wiping audio or other docs.
    func retryPipelineStep(_ step: String) async {
        await MainActor.run { retryingPipelineStep = step }
        PostHogService.shared.capture("assessment_step_retry_started", properties: [
            "step": step,
        ])
        do {
            _ = try await api.retryPipelineStep(visitId: visitId, step: step)
            if let v = try? await api.fetchVisit(id: visitId) {
                await MainActor.run { visit = v }
            }
            await MainActor.run {
                retryingPipelineStep = nil
                // Clear the matching tab so the next poll reloads fresh data.
                switch step {
                case "transcription", "diarization":
                    transcript = nil
                    tabFetchFailed.remove("transcript")
                case "billing":
                    billables = nil
                    tabFetchFailed.remove("billables")
                case "note":
                    note = nil
                    tabFetchFailed.remove("notes")
                case "contract":
                    contract = nil
                    carePlanText = nil
                    tabFetchFailed.remove("care_plan")
                    tabFetchFailed.remove("contract")
                default:
                    break
                }
            }
            PostHogService.shared.capture("assessment_step_retry_succeeded", properties: [
                "step": step,
            ])
            await pollPipelineUntilComplete()
        } catch {
            PostHogService.shared.capture("assessment_step_retry_failed", properties: [
                "step": step,
            ])
            await MainActor.run {
                retryingPipelineStep = nil
                actionError = "Retry failed: \(error.palmFriendlyMessage)"
                showActionError = true
            }
        }
    }

    func markAgreementStatus(_ status: String) async {
        do {
            let updated = try await api.updateAgreementSendStatus(visitId: visitId, status: status)
            await MainActor.run { visit = updated }
            PostHogService.shared.capture("agreement_status_updated", properties: [
                "status": status,
            ])
        } catch {
            await MainActor.run {
                actionError = "Could not update send status: \(error.palmFriendlyMessage)"
                showActionError = true
            }
        }
    }

    // MARK: - Formatting

    func formattedDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }
        guard let parsedDate = date else { return isoString }
        let display = DateFormatter()
        display.dateStyle = .medium
        display.timeStyle = .short
        return display.string(from: parsedDate)
    }

    func formatDuration(_ ms: Int) -> String {
        let totalSeconds = ms / 1000
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
