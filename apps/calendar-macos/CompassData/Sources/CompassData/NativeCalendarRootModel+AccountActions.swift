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
            environment.productAnalytics.track(.logoutCompleted, properties: [:])
            try await signOut()
            pendingLogoutConfirmation = false
        } catch {
            logoutError = "Could not log out. Try again."
        }
    }

    public func requestDeleteAccount() {
        guard !isDeletingAccount else { return }
        deleteAccountError = nil
        pendingDeleteAccountConfirmation = true
    }

    public func cancelDeleteAccount() {
        guard !isDeletingAccount else { return }
        pendingDeleteAccountConfirmation = false
    }

    public func confirmDeleteAccount() async {
        guard pendingDeleteAccountConfirmation, !isDeletingAccount else { return }
        deleteAccountError = nil
        isDeletingAccount = true
        defer { isDeletingAccount = false }
        guard isSignedIn else {
            deleteAccountError = "Sign in to delete your Compass account."
            return
        }
        do {
            try await UserAPI(client: environment.apiClient).deleteAccount()
            environment.productAnalytics.track(.accountDeleted, properties: [:])
            pendingDeleteAccountConfirmation = false
            try await signOut()
        } catch {
            deleteAccountError = "Could not delete your account. Try again."
        }
    }
}
