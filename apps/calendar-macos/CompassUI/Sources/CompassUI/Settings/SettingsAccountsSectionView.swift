import CompassData
import CompassKit
import SwiftUI

struct SettingsAccountsSectionView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var syncStore: SyncConnectionsStore
    private enum DisconnectFocus: Hashable {
        case request(String)
        case confirm(String)
    }

    @FocusState private var disconnectFocus: DisconnectFocus?
    @State private var confirmingDisconnectId: String?
    @State private var showCalDavFallback = false
    @State private var appleEmail = ""
    @State private var applePassword = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Accounts")
                .font(.rubik(15))
                .foregroundStyle(theme.textColor)
            ForEach(syncStore.connections, id: \.id) { connection in
                accountRow(connection)
            }
            connectButtons
            if let error = syncStore.lastError {
                Text(error)
                    .font(.rubik(12))
                    .foregroundStyle(theme.errorColor)
            }
        }
        .accessibilityIdentifier("settings-section-accounts")
        .onChange(of: confirmingDisconnectId) { previous, current in
            disconnectFocus = current.map(DisconnectFocus.confirm) ?? previous.map(DisconnectFocus.request)
        }
        .onChange(of: syncStore.connections.map(\.id)) { _, ids in
            if let confirmingDisconnectId, !ids.contains(confirmingDisconnectId) {
                self.confirmingDisconnectId = nil
            }
        }
    }

    @ViewBuilder
    private func accountRow(_ connection: UserMetadataConnections) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(connection.accountEmail ?? connection.id)
                .font(.rubik(13))
                .foregroundStyle(theme.textColor)
            if confirmingDisconnectId == connection.id {
                Text("Disconnect this account?")
                    .font(.rubik(12))
                    .foregroundStyle(theme.textColor)
                HStack(spacing: 8) {
                    Button("Cancel") { confirmingDisconnectId = nil }
                        .foregroundStyle(theme.textMutedColor)
                    Button(syncStore.isBusy ? "Disconnecting…" : "Confirm", role: .destructive) {
                        Task {
                            await syncStore.disconnect(connectionId: connection.id)
                            confirmingDisconnectId = nil
                        }
                    }
                    .foregroundStyle(theme.errorColor)
                    .focused($disconnectFocus, equals: .confirm(connection.id))
                    .accessibilityLabel("Confirm disconnecting \(connection.accountEmail ?? "calendar account")")
                }
                .buttonStyle(.plain)
                .font(.rubik(12))
                .disabled(syncStore.isBusy)
            } else {
                HStack(spacing: 8) {
                    Button("Reconnect") {
                        Task { await syncStore.reconnect(connection: connection) }
                    }
                    Button("Disconnect") { confirmingDisconnectId = connection.id }
                        .focused($disconnectFocus, equals: .request(connection.id))
                        .accessibilityLabel("Disconnect \(connection.accountEmail ?? "calendar account")")
                }
                .disabled(syncStore.isBusy)
                .buttonStyle(.plain)
                .font(.rubik(12))
                .foregroundStyle(theme.accentColor)
            }
        }
        .accessibilityIdentifier("settings-accounts-list")
    }

    private var connectButtons: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(AccountChoiceCopy.connectCalendarAccountLabel)
                .font(.rubik(13, weight: .semibold))
                .foregroundStyle(theme.textColor)
            Text(AccountChoiceCopy.connectCalendarAccountHelper)
                .font(.rubik(11))
                .foregroundStyle(theme.textMutedColor)
            Button("Connect Google") {
                Task { await syncStore.connect(provider: .google) }
            }
            Button("Connect Microsoft") {
                Task { await syncStore.connect(provider: .microsoft) }
            }
            Button("Connect iCloud Calendar") {
                Task { await syncStore.connectAppleViaEventKit() }
            }
            .accessibilityIdentifier("settings-icloud-eventkit-connect")
            Button("Refresh calendars") {
                Task { await syncStore.refresh() }
            }
            Button(showCalDavFallback ? "Hide app-specific password" : "Other / iCloud (app password)") {
                showCalDavFallback.toggle()
            }
            .font(.rubik(11))
            if showCalDavFallback {
                HStack {
                    TextField("iCloud email", text: $appleEmail)
                    SecureField("App password", text: $applePassword)
                }
                Button("Connect with app password") {
                    Task {
                        await syncStore.connectAppleCredential(
                            username: appleEmail,
                            secret: applePassword)
                    }
                }
                .accessibilityIdentifier("settings-icloud-connect")
            }
        }
        .buttonStyle(.plain)
        .font(.rubik(12))
        .foregroundStyle(theme.accentColor)
        .disabled(syncStore.isBusy)
    }
}
