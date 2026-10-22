@testable import CompassData
import CompassKit
import XCTest

@MainActor
final class LifeViewIntroStoreTests: XCTestCase {
    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: OnboardingStorageKeys.hasSeenLifeViewIntro)
        super.tearDown()
    }

    func testShowsOnceOnLifeView() throws {
        let analytics = CapturingAnalytics()
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
        XCTAssertEqual(analytics.events, [.lifeViewIntroShown])

        store.refresh(
            onLifeView: true,
            authenticated: false,
            userMetadataLoaded: false,
            seenOnServer: false)
        XCTAssertEqual(analytics.events.filter { $0 == .lifeViewIntroShown }.count, 1)
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

private final class CapturingAnalytics: ProductAnalyticsClient, @unchecked Sendable {
    private let lock = NSLock()
    private var recordedEvents: [ProductEvent] = []

    var events: [ProductEvent] {
        lock.withLock { recordedEvents }
    }

    func track(_ event: ProductEvent, properties: ProductEventProperties) {
        lock.withLock { recordedEvents.append(event) }
    }
}
