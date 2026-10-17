import Foundation

extension NativeCalendarRootModel {
    public func exportLocalData() async {
        guard !isExportingLocalData, let onExportLocalData else { return }
        isExportingLocalData = true
        defer { isExportingLocalData = false }
        do {
            let repository = environment.localEventRepository
            let now = referenceNow
            let snapshot = try await Task.detached {
                LocalDataExport(records: try repository.fetchAll(), exportedAt: now)
            }.value
            if try await onExportLocalData(snapshot.encoded(), snapshot.filename()) {
                statusToastStore.show(id: "data-export", message: "Data exported")
            }
        } catch {
            statusToastStore.show(id: "data-export-error", message: "Could not export data. Try again.")
        }
    }

    public func requestLogout() {
        guard isSignedIn, !isLoggingOut else { return }
        closeSettingsIfAllowed()
        guard !settingsStore.isPresented else { return }
        logoutError = nil
        pendingLogoutConfirmation = true
    }

    public func cancelLogout() {
        guard !isLoggingOut else { return }
        pendingLogoutConfirmation = false
    }

    public func confirmLogout() async {
        guard pendingLogoutConfirmation, !isLoggingOut else { return }
        guard eventsStore.inFlightMutations == 0 else {
            logoutError = "Wait for your event changes to finish, then try again."
            return
        }
        logoutError = nil
        isLoggingOut = true
        defer { isLoggingOut = false }
        do {
            try await signOut()
            pendingLogoutConfirmation = false
        } catch {
            logoutError = "Could not log out. Try again."
        }
    }
}
