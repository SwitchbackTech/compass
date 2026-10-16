import CompassData
import CompassKit
import XCTest

@MainActor
final class BookingStoreTests: XCTestCase {
    func testPreviewSlotStartsUsesFormAvailability() {
        let store = BookingStore(apiClient: CompassAPIClient())
        store.form.weeklyAvailability = [
            BookingPageWeeklyAvailability(end: "12:00", start: "09:00", weekday: .v1),
        ]
        store.form.durationMinutes = .v30
        store.form.minNoticeHours = 0
        store.form.maxHorizonDays = 60
        store.form.timeZone = IANATimeZone(rawValue: "UTC")
        let now = ISO8601DateFormatter().date(from: "2026-09-07T12:00:00Z")!
        let slots = store.previewSlotStarts(now: now)
        XCTAssertFalse(slots.isEmpty)
    }

    func testSetDestinationCalendarIdUpdatesBlockingIds() {
        let store = BookingStore(apiClient: CompassAPIClient())
        let destination = GridLayoutSnapshotFixtures.parityCalendars[0]
        store.form.setDestinationCalendarId(destination.id, calendars: GridLayoutSnapshotFixtures.parityCalendars)
        XCTAssertEqual(store.form.destinationCalendarId, destination.id)
        XCTAssertEqual(
            store.form.blockingCalendarIds,
            BookingCalendarLogic.defaultBlockingCalendarIds(
                destinationCalendarId: destination.id,
                calendars: GridLayoutSnapshotFixtures.parityCalendars
            )
        )
    }
}

extension BookingStoreTests {
    func testSigningOutClearsTheFormAndDiscardsAnInFlightPage() async throws {
        let client = CompassAPIClient(
            sessionStore: MemorySessionStore(tokens: SessionTokens(accessToken: "access", refreshToken: "refresh", frontToken: "front")),
            urlSession: StubURLProtocol.makeSession())
        let store = BookingStore(apiClient: client)
        let payload = try JSONEncoder().encode(AdminGetBookingPageSetupResponse(
            blockingCalendarIds: [], destinationCalendarId: "old-account", durationMinutes: .v30,
            enabled: false, isConfigured: false, maxHorizonDays: 30, minNoticeHours: 24,
            suggestedSlug: "old-account", timeZone: IANATimeZone(rawValue: "UTC"), weeklyAvailability: []))
        let started = XCTestExpectation(description: "booking page requested")
        let release = DispatchSemaphore(value: 0)
        defer {
            release.signal()
            StubURLProtocol.Handler.requestHandler = nil
        }
        StubURLProtocol.Handler.requestHandler = { _ in
            started.fulfill()
            _ = release.wait(timeout: .now() + 5)
            return StubURLProtocol.Response(statusCode: 200, body: payload)
        }
        store.setAuthenticated(true)
        store.form.slug = "old-account"
        let request = Task { await store.refreshPage() }
        let result = await XCTWaiter.fulfillment(of: [started], timeout: 5)
        XCTAssertEqual(result, .completed)
        store.setAuthenticated(false)
        release.signal()
        await request.value
        XCTAssertNil(store.serverPage)
        XCTAssertNotEqual(store.form.slug, "old-account")
        XCTAssertFalse(store.isLoadingPage)
        XCTAssertFalse(store.pageLoadFailed)
    }
}
