import CompassData
import CompassKit
import XCTest

@MainActor
final class AuthStoreTests: XCTestCase {
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
