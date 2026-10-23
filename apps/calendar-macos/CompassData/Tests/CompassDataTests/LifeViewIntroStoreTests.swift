@testable import CompassData
import CompassKit
import XCTest

@MainActor
final class LifeViewIntroStoreTests: XCTestCase {
    private func makeDefaults() -> UserDefaults {
        let suite = "LifeViewIntroStoreTests.\(UUID().uuidString)"
        addTeardownBlock { UserDefaults.standard.removePersistentDomain(forName: suite) }
        return UserDefaults(suiteName: suite)!
    }

    func testShowsOnceOnLifeView() throws {
        let analytics = CapturingAnalytics()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let store = LifeViewIntroStore(
            userAPI: UserAPI(client: environment.apiClient),
            defaults: makeDefaults(),
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
        let defaults = makeDefaults()
        let dismissed = expectation(description: "Life intro dismissal completes")
        let analytics = CapturingAnalytics(onDismiss: { dismissed.fulfill() })
        let store = LifeViewIntroStore(
            userAPI: UserAPI(client: environment.apiClient),
            defaults: defaults,
            analytics: analytics)
        store.refresh(
            onLifeView: true,
            authenticated: false,
            userMetadataLoaded: false,
            seenOnServer: false)
        store.dismiss(reason: .escape, authenticated: false)
        await fulfillment(of: [dismissed], timeout: 1)
        XCTAssertFalse(store.isMounted)
        XCTAssertTrue(LifeViewIntroGating.hasSeenLocally(defaults: defaults))
    }
}

private final class CapturingAnalytics: ProductAnalyticsClient, @unchecked Sendable {
    private let lock = NSLock()
    private var recordedEvents: [ProductEvent] = []
    private let onDismiss: @Sendable () -> Void

    init(onDismiss: @escaping @Sendable () -> Void = {}) {
        self.onDismiss = onDismiss
    }

    var events: [ProductEvent] {
        lock.withLock { recordedEvents }
    }

    func track(_ event: ProductEvent, properties: ProductEventProperties) {
        lock.withLock { recordedEvents.append(event) }
        if event == .lifeViewIntroDismissed { onDismiss() }
    }
}
