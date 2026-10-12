import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class SystemCalendarConnectTests: XCTestCase {
    func testDeniedAccessSurfacesSettingsCopy() async throws {
        let database = try AppDatabase.inMemory()
        let calendarRepository = CalendarRepository(database: database)
        let access = MockSystemCalendarAccessClient(
            status: .denied,
            requestResult: .denied)
        let connector = SystemCalendarConnector(accessClient: access)
        let store = SyncConnectionsStore(
            oauthService: OAuthAuthorizationService(
                apiClient: CompassAPIClient(
                    appURL: AppHostPreference.productionURL,
                    sessionStore: KeychainSessionStore(),
                    urlSession: .shared),
                webAuthPresenter: nil),
            userAPI: UserAPI(
                client: CompassAPIClient(
                    appURL: AppHostPreference.productionURL,
                    sessionStore: KeychainSessionStore(),
                    urlSession: .shared)),
            configStore: ConfigStore(
                apiClient: CompassAPIClient(
                    appURL: AppHostPreference.productionURL,
                    sessionStore: KeychainSessionStore(),
                    urlSession: .shared)),
            systemCalendarConnector: connector,
            calendarRepository: calendarRepository)

        await store.connectAppleViaEventKit()

        XCTAssertEqual(store.lastError, SystemCalendarConnectCopy.deniedMessage)
        XCTAssertFalse(SystemCalendarConnectionStore.isConnected)
    }

    func testRestrictedAccessUsesRestrictedCopy() async throws {
        let database = try AppDatabase.inMemory()
        let calendarRepository = CalendarRepository(database: database)
        let access = MockSystemCalendarAccessClient(
            status: .restricted,
            requestResult: .restricted)
        let connector = SystemCalendarConnector(accessClient: access)
        let store = SyncConnectionsStore(
            oauthService: OAuthAuthorizationService(
                apiClient: CompassAPIClient(
                    appURL: AppHostPreference.productionURL,
                    sessionStore: KeychainSessionStore(),
                    urlSession: .shared),
                webAuthPresenter: nil),
            userAPI: UserAPI(
                client: CompassAPIClient(
                    appURL: AppHostPreference.productionURL,
                    sessionStore: KeychainSessionStore(),
                    urlSession: .shared)),
            configStore: ConfigStore(
                apiClient: CompassAPIClient(
                    appURL: AppHostPreference.productionURL,
                    sessionStore: KeychainSessionStore(),
                    urlSession: .shared)),
            systemCalendarConnector: connector,
            calendarRepository: calendarRepository)

        await store.connectAppleViaEventKit()

        XCTAssertEqual(store.lastError, SystemCalendarConnectCopy.restrictedMessage)
    }

    override func tearDown() {
        SystemCalendarConnectionStore.resetForTests()
        super.tearDown()
    }
}
