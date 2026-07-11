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
        if activeTab == 0 {
            await loadAllTabData()
            return
        }

        switch activeTab {
        case 1:
            await loadTranscript()
        case 2:
            await loadBillables()
        case 3:
            await loadNote()
        case 4:
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
        _ = await (t, b, n, c)
    }

    func loadTranscript() async {
        guard transcript == nil else { return }
        do {
            let t = try await api.fetchVisitTranscript(visitId: visitId)
            await MainActor.run { transcript = t; tabFetchFailed.remove(1) }
        } catch {
            // While the pipeline is still running, a missing result isn't an
            // error — show the friendly "processing" state, not "Failed to Load".
            await MainActor.run { if !isPipelineProcessing { _ = tabFetchFailed.insert(1) } }
        }
    }

    func loadBillables() async {
        guard billables == nil else { return }
        do {
            let b = try await api.fetchVisitBillables(visitId: visitId)
            await MainActor.run { billables = b; tabFetchFailed.remove(2) }
        } catch {
            await MainActor.run { if !isPipelineProcessing { _ = tabFetchFailed.insert(2) } }
        }
    }

    func loadNote() async {
        guard note == nil else { return }
        do {
            let n = try await api.fetchVisitNote(visitId: visitId)
            await MainActor.run { note = n; tabFetchFailed.remove(3) }
        } catch {
            await MainActor.run { if !isPipelineProcessing { _ = tabFetchFailed.insert(3) } }
        }
    }

    func loadContract() async {
        guard contract == nil else { return }
        do {
            let c = try await api.fetchVisitContract(visitId: visitId)
            await MainActor.run { contract = c; tabFetchFailed.remove(4) }
        } catch {
            await MainActor.run { if !isPipelineProcessing { _ = tabFetchFailed.insert(4) } }
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
