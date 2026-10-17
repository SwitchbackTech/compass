import CompassData
import CompassKit
import XCTest

@MainActor
final class EventsStoreTests: XCTestCase {
    func testOptimisticCreateThenSettleInvalidatesRange() async throws {
        let database = try AppDatabase.inMemory()
        let repository = EventRepository(database: database)
        let localEvents = LocalEventRepository(database: database)
        let rangeCache = RangeCache(database: database)
        let mockAPI = MockEventsAPI()
        let store = EventsStore(
            repository: repository,
            localEvents: localEvents,
            rangeCache: rangeCache,
            eventsAPI: mockAPI
        )

        let key = EventRangeQueryKey(
            scope: .week,
            source: .remote,
            start: "2026-01-01T00:00:00.000Z",
            end: "2026-01-08T00:00:00.000Z"
        )
        try rangeCache.markLoaded(key: key)
        if case .missing = try store.coverage(for: key) {
            XCTFail("expected loaded range before mutation")
        }

        let optimistic = try StoreSampleEvents.timedEvent(id: "evt-new", title: "New")
        let input = try makeCreateInput(from: optimistic)

        mockAPI.createHandler = { _ in
            try StoreSampleEvents.response(from: optimistic)
        }

        try await store.createOptimistic(input: input, optimisticEvent: optimistic)

        let coverage = try store.coverage(for: key)
        if case .missing = coverage {
            // expected after settle invalidation
        } else {
            XCTFail("expected range invalidation after mutation settle, got \(coverage)")
        }
    }

    func testOfflineRangeUsesStaleCacheAndRetriesWhenConnectionReturns() async throws {
        let (store, api, repository, cache, key) = try cachedRange()
        let cached = try StoreSampleEvents.timedEvent(id: "cached")
        try repository.upsert(events: [cached], isLocal: false)
        let stamp = Date(timeIntervalSince1970: 0)
        try cache.markLoaded(key: key, fetchedAt: stamp)
        api.listHandler = { _ in throw URLError(.notConnectedToInternet) }
        let offline = try await store.loadRange(key: key)
        XCTAssertEqual(offline, [cached])
        XCTAssertEqual(try store.coverage(for: key), .stale(fetchedAt: stamp))

        api.listHandler = { _ in [] }
        let online = try await store.loadRange(key: key)
        XCTAssertTrue(online.isEmpty)
        XCTAssertTrue(try repository.fetchAll().isEmpty)
        guard case .fresh = try store.coverage(for: key) else {
            return XCTFail("Expected successful retry to refresh coverage")
        }
    }

    func testOfflineUnloadedRangeDoesNotPretendToBeEmpty() async throws {
        let (store, api, _, _, key) = try cachedRange()
        api.listHandler = { _ in throw URLError(.notConnectedToInternet) }
        do {
            _ = try await store.loadRange(key: key)
            XCTFail("Expected the missing-range connection failure")
        } catch let error as URLError {
            XCTAssertEqual(error.code, .notConnectedToInternet)
        }
        XCTAssertEqual(try store.coverage(for: key), .missing)
    }

    func testAuthenticationFailureDoesNotFallBackToCachedRange() async throws {
        let (store, api, _, cache, key) = try cachedRange()
        try cache.markLoaded(key: key, fetchedAt: Date(timeIntervalSince1970: 0))
        api.listHandler = { _ in throw URLError(.userAuthenticationRequired) }
        do {
            _ = try await store.loadRange(key: key)
            XCTFail("Expected authentication error")
        } catch let error as URLError {
            XCTAssertEqual(error.code, .userAuthenticationRequired)
        }
    }

    func testInvalidationDuringOfflineRequestDoesNotReuseOldCoverage() async throws {
        let (store, api, _, cache, key) = try cachedRange()
        try cache.markLoaded(key: key, fetchedAt: Date(timeIntervalSince1970: 0))
        api.listHandler = { _ in
            try cache.clear()
            throw URLError(.notConnectedToInternet)
        }
        do {
            _ = try await store.loadRange(key: key)
            XCTFail("Expected invalidated range to reject fallback")
        } catch let error as URLError {
            XCTAssertEqual(error.code, .notConnectedToInternet)
        }
        XCTAssertEqual(try store.coverage(for: key), .missing)
    }

    private func cachedRange() throws -> (EventsStore, MockEventsAPI, EventRepository, RangeCache, EventRangeQueryKey) {
        let database = try AppDatabase.inMemory()
        let repository = EventRepository(database: database)
        let cache = RangeCache(database: database)
        let api = MockEventsAPI()
        let store = EventsStore(
            repository: repository, localEvents: LocalEventRepository(database: database),
            rangeCache: cache, eventsAPI: api)
        let key = EventRangeQueryKey(scope: .week, source: .remote,
            start: "2026-01-01T00:00:00.000Z", end: "2026-01-08T00:00:00.000Z")
        return (store, api, repository, cache, key)
    }

    private func makeCreateInput(from event: Event) throws -> CreateEventInput {
        _ = event
        let json = """
        {
          "calendarId": "cal-1",
          "content": {
            "kind": "details",
            "title": "New",
            "description": "",
            "location": ""
          },
          "id": "evt-new",
          "recurrence": { "kind": "single" },
          "schedule": {
            "kind": "timed",
            "start": "2026-01-01T10:00:00.000Z",
            "end": "2026-01-01T11:00:00.000Z",
            "timeZone": "UTC"
          }
        }
        """
        return try ContractTestDecoding.decodeJSON(json, as: CreateEventInput.self)
    }
}
