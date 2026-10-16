import CompassData
import CompassKit
import XCTest

@MainActor
final class AuthStoreTests: XCTestCase {
    override func tearDown() {
        StubURLProtocol.Handler.requestHandler = nil
        super.tearDown()
    }

    func testBootstrapKeepsNewAnonymousUserInLocalMode() async throws {
        let authStore = try makeSignedOutAuthStore(hasAuthenticatedBefore: false)

        await authStore.bootstrap()

        XCTAssertFalse(authStore.authenticated)
        XCTAssertFalse(authStore.isModalPresented)
    }

    func testBootstrapOpensLoginWhenReturningUserSessionIsGone() async throws {
        let authStore = try makeSignedOutAuthStore(hasAuthenticatedBefore: true)

        await authStore.bootstrap()

        XCTAssertFalse(authStore.authenticated)
        XCTAssertTrue(authStore.isModalPresented)
        XCTAssertEqual(authStore.currentView, .login)
    }

    private func makeSignedOutAuthStore(hasAuthenticatedBefore: Bool) throws -> AuthStore {
        let client = CompassAPIClient(
            appURL: URL(string: "https://www.compasscalendar.com")!,
            sessionStore: MemorySessionStore(tokens: nil),
            urlSession: StubURLProtocol.makeSession())
        StubURLProtocol.Handler.requestHandler = { _ in
            StubURLProtocol.Response(statusCode: 200, body: Data("{}".utf8))
        }
        let database = try AppDatabase.inMemory()
        let metadata = UserMetadataRepository(database: database)
        if hasAuthenticatedBefore {
            try AuthRememberedState.markUserHasAuthenticated(repository: metadata)
        }
        return AuthStore(
            apiClient: client,
            configStore: ConfigStore(apiClient: client),
            oauthService: OAuthAuthorizationService(apiClient: client, webAuthPresenter: nil),
            analyticsIdentity: NoOpAnalyticsIdentityCoordinator(),
            usesFixtureTransport: false,
            userMetadataRepository: metadata)
    }

    func testWrongCredentialsSurfacesWebCopy() async throws {
        let store = MemorySessionStore(tokens: nil)
        let client = CompassAPIClient(
            appURL: URL(string: "https://www.compasscalendar.com")!,
            sessionStore: store,
            urlSession: StubURLProtocol.makeSession())
        StubURLProtocol.Handler.requestHandler = { request in
            if request.url?.path.hasSuffix("/signin") == true {
                return StubURLProtocol.Response(
                    statusCode: 401,
                    body: Data(#"{"status":"WRONG_CREDENTIALS_ERROR"}"#.utf8))
            }
            return StubURLProtocol.Response(statusCode: 404)
        }
        let oauthService = OAuthAuthorizationService(apiClient: client, webAuthPresenter: nil)
        let authStore = AuthStore(
            apiClient: client,
            configStore: ConfigStore(apiClient: client),
            oauthService: oauthService,
            analyticsIdentity: NoOpAnalyticsIdentityCoordinator(),
            usesFixtureTransport: false)

        await authStore.signIn(email: "a@example.com", password: "password123")

        XCTAssertEqual(authStore.submitError, "Incorrect email or password.")
        XCTAssertFalse(authStore.authenticated)
    }
}

extension AuthStoreTests {
    func testLateProfileDoesNotRestoreIdentityOrCloseLoginAfterSessionExpiry() async throws {
        let client = CompassAPIClient(
            sessionStore: MemorySessionStore(tokens: SessionTokens(accessToken: "access", refreshToken: "refresh", frontToken: "front")),
            urlSession: StubURLProtocol.makeSession())
        let store = AuthStore(apiClient: client, configStore: ConfigStore(apiClient: client),
            oauthService: OAuthAuthorizationService(apiClient: client, webAuthPresenter: nil),
            analyticsIdentity: NoOpAnalyticsIdentityCoordinator(), usesFixtureTransport: false)
        let profile = UserProfile(email: "old@example.com", firstName: "Old", lastName: "Account", locale: "en",
            name: "Old Account", picture: "", userId: "old-account")
        let payload = try JSONEncoder().encode(profile)
        let started = XCTestExpectation(description: "profile requested")
        let release = DispatchSemaphore(value: 0)
        defer { release.signal() }
        StubURLProtocol.Handler.requestHandler = { _ in
            started.fulfill()
            _ = release.wait(timeout: .now() + 5)
            return StubURLProtocol.Response(statusCode: 200, body: payload)
        }
        let bootstrap = Task { await store.bootstrap() }
        let result = await XCTWaiter.fulfillment(of: [started], timeout: 5)
        XCTAssertEqual(result, .completed)
        await store.handleSessionExpired()
        release.signal()
        await bootstrap.value
        XCTAssertFalse(store.authenticated)
        XCTAssertNil(store.userId)
        XCTAssertTrue(store.isModalPresented)
        XCTAssertEqual(store.currentView, .login)
    }
}

extension AuthStoreTests {
    func testOfflineProfileLookupRetainsTheSessionIdentity() async throws {
        let front = Data(#"{"uid":"account-a","ate":123,"up":{}}"#.utf8).base64EncodedString()
        let client = CompassAPIClient(
            sessionStore: MemorySessionStore(tokens: SessionTokens(accessToken: "access", refreshToken: "refresh", frontToken: front)),
            urlSession: StubURLProtocol.makeSession())
        StubURLProtocol.Handler.requestHandler = { _ in throw URLError(.notConnectedToInternet) }
        let store = AuthStore(apiClient: client, configStore: ConfigStore(apiClient: client),
            oauthService: OAuthAuthorizationService(apiClient: client, webAuthPresenter: nil),
            analyticsIdentity: NoOpAnalyticsIdentityCoordinator(), usesFixtureTransport: false)
        await store.bootstrap()
        XCTAssertTrue(store.authenticated)
        XCTAssertEqual(store.userId, "account-a")
        XCTAssertFalse(store.isModalPresented)
    }
}
