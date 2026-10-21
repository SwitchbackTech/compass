import CompassKit
import Foundation

@MainActor
@Observable
public final class SyncConnectionsStore {
    public private(set) var isBusy = false
    public private(set) var lastError: String?
    public private(set) var connections: [UserMetadataConnections] = []
    public private(set) var userMetadata: UserMetadata?

    private var sessionRevision = 0

    private let oauthService: OAuthAuthorizationService
    private let userAPI: UserAPI
    private let configStore: ConfigStore
    private let systemCalendarConnector: SystemCalendarConnector
    private let calendarRepository: CalendarRepository

    public init(
        oauthService: OAuthAuthorizationService,
        userAPI: UserAPI,
        configStore: ConfigStore,
        systemCalendarConnector: SystemCalendarConnector = SystemCalendarConnector(),
        calendarRepository: CalendarRepository
    ) {
        self.oauthService = oauthService
        self.userAPI = userAPI
        self.configStore = configStore
        self.systemCalendarConnector = systemCalendarConnector
        self.calendarRepository = calendarRepository
    }

    public func resetSession() {
        sessionRevision += 1
        isBusy = false
        connections = []
        userMetadata = nil
        lastError = nil
    }

    public func reloadFromMetadata() async {
        let revision = sessionRevision
        do {
            let metadata = try await userAPI.metadata()
            guard revision == sessionRevision else { return }
            userMetadata = metadata
            connections = metadata.connections ?? []
        } catch {
            guard revision == sessionRevision else { return }
            userMetadata = nil
            connections = []
        }
    }

    public func reconnect(connection: UserMetadataConnections) async {
        await runBusy {
            guard let provider = connection.provider else {
                lastError = "This account cannot be reconnected."
                return
            }
            let outcome = await oauthService.startConnection(
                provider: provider,
                connectionId: ConnectionId(rawValue: connection.id),
                oauthClients: oauthClients())
            applyOutcome(outcome, fallback: "We couldn't reconnect this account.")
        }
    }

    public func connect(provider: ProviderEnum) async {
        await runBusy {
            let outcome = await oauthService.startConnection(
                provider: provider,
                connectionId: nil,
                oauthClients: oauthClients())
            applyOutcome(outcome, fallback: "We couldn't connect your calendar.")
        }
    }

    public func connectAppleViaEventKit() async {
        await runBusy {
            let outcome = await systemCalendarConnector.connect()
            switch outcome {
            case let .success(calendars):
                do {
                    try calendarRepository.upsert(calendars: calendars)
                    lastError = nil
                } catch {
                    lastError = SystemCalendarConnectCopy.connectFailedMessage
                }
            case let .failure(.denied):
                lastError = SystemCalendarConnectCopy.deniedMessage
            case let .failure(.restricted):
                lastError = SystemCalendarConnectCopy.restrictedMessage
            }
        }
    }

    public func connectAppleCredential(username: String, secret: String) async {
        await runBusy {
            do {
                try await oauthService.connectAppleCredential(
                    username: username,
                    secret: secret)
                lastError = nil
                await reloadFromMetadata()
            } catch {
                lastError = "We couldn't connect iCloud Calendar. Please try again."
            }
        }
    }

    public func refresh() async {
        await runBusy {
            do {
                _ = try await oauthService.refreshConnections()
                lastError = nil
                await reloadFromMetadata()
            } catch {
                lastError = "We couldn't refresh your calendars. Please try again."
            }
        }
    }

    public func disconnect(connectionId: String) async {
        await runBusy {
            do {
                try await oauthService.disconnect(connectionId: ConnectionId(rawValue: connectionId))
                lastError = nil
                await reloadFromMetadata()
            } catch {
                lastError = "We couldn't disconnect this account. Please try again."
            }
        }
    }

    public func handleConnectDeepLink(_ urlString: String) async -> Bool {
        guard urlString.contains("compass://connect/") else { return false }
        await runBusy {
            let outcome = await oauthService.handleConnectDeepLink(urlString)
            applyOutcome(outcome, fallback: "We couldn't finish connecting your calendar.")
        }
        return true
    }

    private func applyOutcome(_ outcome: OAuthAuthorizationOutcome, fallback: String) {
        switch outcome {
        case .completed:
            lastError = nil
            Task { await reloadFromMetadata() }
        case .userCancelled:
            lastError = nil
        case let .failed(message):
            lastError = message.isEmpty ? fallback : message
        }
    }

    private func oauthClients() -> OAuthPublicClients {
        OAuthPublicClients(oauth: configStore.config?.oauth)
    }

    private func runBusy(_ work: () async -> Void) async {
        let revision = sessionRevision
        isBusy = true
        defer { if revision == sessionRevision { isBusy = false } }
        await work()
    }
}
