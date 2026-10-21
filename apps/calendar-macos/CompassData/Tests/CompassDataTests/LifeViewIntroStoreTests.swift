import CompassData
import CompassKit
import XCTest

@MainActor
final class LifeViewIntroStoreTests: XCTestCase {
    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: OnboardingStorageKeys.hasSeenLifeViewIntro)
        super.tearDown()
    }

    func testShowsOnceOnLifeView() throws {
        var events: [ProductEvent] = []
        let analytics = CapturingAnalytics { event, _ in events.append(event) }
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let store = LifeViewIntroStore(
            userAPI: UserAPI(client: environment.apiClient),
            analytics: analytics)

        store.refresh(
            onLifeView: false,
            authenticated: false,
            userMetadataLoaded: false,
            seenOnServer: false)
        XCTAssertFalse(store.isMounted)

        store.refresh(
            onLifeView: true,
            authenticated: false,
            userMetadataLoaded: false,
            seenOnServer: false)
        XCTAssertTrue(store.isMounted)
        XCTAssertEqual(events, [.lifeViewIntroShown])

        store.refresh(
            onLifeView: true,
            authenticated: false,
            userMetadataLoaded: false,
            seenOnServer: false)
        XCTAssertEqual(events.filter { $0 == .lifeViewIntroShown }.count, 1)
    }

    func testDismissMarksLocalSeen() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let store = LifeViewIntroStore(
            userAPI: UserAPI(client: environment.apiClient))
        store.refresh(
            onLifeView: true,
            authenticated: false,
            userMetadataLoaded: false,
            seenOnServer: false)
        store.dismiss(reason: .escape, authenticated: false)
        try? await Task.sleep(for: .milliseconds(250))
        XCTAssertFalse(store.isMounted)
        XCTAssertTrue(LifeViewIntroGating.hasSeenLocally())
    }
}

private struct CapturingAnalytics: ProductAnalyticsClient {
    private let handler: (ProductEvent, ProductEventProperties) -> Void

    init(handler: @escaping (ProductEvent, ProductEventProperties) -> Void) {
        self.handler = handler
    }

    func track(_ event: ProductEvent, properties: ProductEventProperties) {
        handler(event, properties)
    }
}
