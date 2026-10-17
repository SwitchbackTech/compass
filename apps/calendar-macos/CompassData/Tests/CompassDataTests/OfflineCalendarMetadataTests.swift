import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class OfflineCalendarMetadataTests: XCTestCase {
    func testKnownAccountStartsWithCachedCalendarsAndEventsWhileOffline() async throws {
        let (environment, model, event) = try await startWithCache(owner: "account-a")
        XCTAssertEqual(model.calendars.map(\.id), [event.calendarId.rawValue])
        XCTAssertEqual(model.loadedEvents.map(\.id), [event.id])
        XCTAssertEqual(try environment.calendarRepository.fetchAll().count, 1)
    }

    func testDifferentAccountCannotReuseOfflineCalendarMetadata() async throws {
        let (environment, model, _) = try await startWithCache(owner: "account-b")
        XCTAssertTrue(model.calendars.isEmpty)
        XCTAssertTrue(model.loadedEvents.isEmpty)
        XCTAssertTrue(try environment.calendarRepository.fetchAll().isEmpty)
    }

    func testSuccessfulRefreshPrunesMissingRemoteCalendarsAndKeepsLocalData() async throws {
        let (environment, model, sample) = try await startWithCache(owner: "account-a")
        let localCalendar = LocalCalendarSentinel.synthesizeCalendar(id: "local-calendar")
        let localEvent = Event(calendarId: "local-calendar", content: sample.content, createdAt: sample.createdAt,
            id: "local-event", recurrence: sample.recurrence, schedule: sample.schedule, updatedAt: sample.updatedAt)
        try environment.calendarRepository.upsert(calendars: [localCalendar])
        try environment.localEventRepository.put(.init(id: localEvent.id, event: localEvent, isDemo: false))
        StubURLProtocol.Handler.requestHandler = { request in
            if request.url?.path.hasSuffix("/calendars") == true {
                return .init(statusCode: 200, body: Data("{\"calendars\":[]}".utf8))
            }
            throw URLError(.notConnectedToInternet)
        }
        await model.handleResume()
        XCTAssertEqual(model.calendars.map(\.id), [localCalendar.id])
        XCTAssertEqual(try environment.calendarRepository.fetchAll().map(\.id), [localCalendar.id])
        XCTAssertEqual(try environment.localEventRepository.fetchAll().map(\.id), [localEvent.id])
        XCTAssertTrue(model.loadedEvents.isEmpty)
        XCTAssertTrue(try EventRepository(database: environment.database).fetchAll().isEmpty)
    }

    private func startWithCache(owner: String) async throws -> (NativeCalendarEnvironment, NativeCalendarRootModel, Event) {
        let previous = EffectiveTimeZone.identifier
        let session = StubURLProtocol.makeSession()
        StubURLProtocol.Handler.requestHandler = { _ in throw URLError(.notConnectedToInternet) }
        let front = Data("{\"uid\":\"account-a\"}".utf8).base64EncodedString()
        let environment = try NativeCalendarEnvironment(appURL: URL(string: "https://compass.invalid")!,
            inMemoryDatabase: true,
            sessionStore: MemorySessionStore(tokens: .init(accessToken: "test", refreshToken: "test", frontToken: front)),
            urlSession: session)
        try AuthRememberedState.markUserHasAuthenticated(repository: environment.userMetadataRepository)
        try environment.userMetadataRepository.upsert(key: DemoDataSeeder.migrationKey, value: true)
        try AccountCacheIdentity.record(userId: owner, repository: environment.userMetadataRepository)
        let event = try StoreSampleEvents.timedEvent(id: "offline-event")
        try environment.calendarRepository.upsert(calendars: [LocalCalendarSentinel.synthesizeCalendar(id: event.calendarId)])
        try EventRepository(database: environment.database).upsert(events: [event], isLocal: false)
        let model = NativeCalendarRootModel(environment: environment)
        model.viewStore.setPinnedTimeZone("UTC")
        model.viewStore.anchorDate = try XCTUnwrap(CompassDateParsing.parseInEffectiveTimeZone("2026-01-01T12:00:00.000Z"))
        let range = CalendarWindowMath.weekEventQueryRange(anchor: model.viewStore.anchorDate)
        try RangeCache(database: environment.database).markLoaded(key: .init(scope: .week, source: .remote,
            start: range.startDate, end: range.endDate), fetchedAt: Date(timeIntervalSince1970: 0))
        addTeardownBlock {
            await model.authStore.handleSessionExpired()
            session.invalidateAndCancel()
            StubURLProtocol.Handler.requestHandler = nil
            EffectiveTimeZone.identifier = previous
        }
        await model.start()
        return (environment, model, event)
    }
}
