import CompassData
import CompassKit
import XCTest

@MainActor
final class EventsStoreSessionTests: XCTestCase {
    func testSessionResetClearsRemoteDataAndRejectsAnOlderResponse() async throws {
        let database = try AppDatabase.inMemory()
        let repository = EventRepository(database: database)
        let local = LocalEventRepository(database: database)
        let ranges = RangeCache(database: database)
        let oldEvent = try StoreSampleEvents.timedEvent(id: "old-account", title: "Old account")
        let localEvent = try StoreSampleEvents.timedEvent(id: "local", title: "Local")
        try repository.upsert(events: [oldEvent], isLocal: false)
        try local.put(LocalEventRecord(id: localEvent.id, event: localEvent, isDemo: false))
        let gate = PendingList()
        let api = MockEventsAPI()
        api.listHandler = { _ in await gate.response() }
        let store = EventsStore(repository: repository, localEvents: local, rangeCache: ranges, eventsAPI: api)
        let key = EventRangeQueryKey(scope: .week, source: .remote,
            start: "2026-01-01T00:00:00.000Z", end: "2026-01-08T00:00:00.000Z")
        let request = Task { try await store.loadRange(key: key) }
        await gate.waitUntilRequested()

        try store.resetRemoteSession()
        XCTAssertTrue(try repository.fetchAll().isEmpty)
        XCTAssertEqual(try local.fetchAll().map(\.event), [localEvent])
        await gate.resolve([oldEvent])
        do {
            _ = try await request.value
            XCTFail("The previous session's response must be discarded")
        } catch is CancellationError {
            // Expected: the old response cannot repopulate the account cache.
        }
        XCTAssertTrue(try repository.fetchAll().isEmpty)
        XCTAssertEqual(try ranges.coverage(for: key), .missing)

        let newEvent = try StoreSampleEvents.timedEvent(id: "new-account", title: "New account")
        api.listHandler = { _ in [newEvent] }
        let loaded = try await store.loadRange(key: key)
        XCTAssertEqual(loaded, [newEvent])
        XCTAssertEqual(try store.fetchAllEvents(), [newEvent])
    }
}

private actor PendingList {
    private var continuation: CheckedContinuation<[Event], Never>?
    private var started: CheckedContinuation<Void, Never>?

    func response() async -> [Event] {
        await withCheckedContinuation {
            continuation = $0
            started?.resume()
            started = nil
        }
    }

    func waitUntilRequested() async {
        if continuation != nil { return }
        await withCheckedContinuation { started = $0 }
    }

    func resolve(_ events: [Event]) {
        continuation?.resume(returning: events)
        continuation = nil
    }
}
