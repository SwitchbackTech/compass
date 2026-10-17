import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class LocalRecurringReadTests: XCTestCase {
    func testStoredSeriesRendersOccurrencesWithoutMaterializingRecords() async throws {
        let database = try AppDatabase.inMemory()
        let local = LocalEventRepository(database: database)
        let sample = try StoreSampleEvents.timedEvent(id: "weekly")
        let series = Event(
            calendarId: sample.calendarId, content: sample.content, createdAt: sample.createdAt,
            id: sample.id, recurrence: .series(.init(kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"])),
            schedule: sample.schedule, updatedAt: sample.updatedAt)
        try local.put(.init(id: series.id, event: series, isDemo: false))
        let store = EventsStore(
            repository: EventRepository(database: database), localEvents: local,
            rangeCache: RangeCache(database: database), eventsAPI: MockEventsAPI(), source: .local)
        let range = EventRangeQueryKey(scope: .week, source: .local,
            start: "2026-01-08T00:00:00.000Z", end: "2026-01-09T00:00:00.000Z")
        let events = try await store.loadRange(key: range)
        XCTAssertEqual(CalendarEventViewModel.gridInputs(from: events).timedEvents.count, 1)
        XCTAssertEqual(try CalendarEventViewModel.gridInputs(from: store.fetchAllEvents()).timedEvents.count, 3)
        XCTAssertEqual(try local.fetchAll().count, 1)
        XCTAssertTrue(events.contains { $0.id == series.id })
        let occurrence = try XCTUnwrap(events.first { if case .occurrence = $0.recurrence { return true }; return false })
        try await store.deleteOptimistic(id: occurrence.id, scope: .this)
        XCTAssertEqual(try CalendarEventViewModel.gridInputs(from: store.fetchAllEvents()).timedEvents.count, 2)
        let reopened = LocalEventRepository(database: database)
        XCTAssertEqual(try reopened.expandedRecords().count, 3)
    }
}

extension LocalRecurringReadTests {
    func testLegacyMaterializedSeriesDoesNotGainDuplicateVirtualInstances() throws {
        let local = try repository()
        let first = try occurrences(local)[0]
        let id = EventId(rawValue: "weekly|2026-01-01T10:00:00.000Z")
        try local.put(.init(id: id, event: LocalEventExpansion.copy(first, id: id), isDemo: true))
        XCTAssertEqual(try occurrences(local).map(\.id), [id])
    }

    func testDeletingVirtualOccurrencePersistsAndRestoreWinsOverExclusion() throws {
        let local = try repository()
        let occurrence = try occurrences(local)[1]
        XCTAssertTrue(try local.deleteOccurrence(id: occurrence.id, scope: .this))
        XCTAssertEqual(try occurrences(local).count, 2)
        XCTAssertEqual(try local.fetchAll().count, 1)
        try local.put(.init(id: occurrence.id, event: occurrence, isDemo: false))
        XCTAssertEqual(try occurrences(local).count, 3)
    }

    func testMovedOverrideSuppressesOriginalEvenOutsideRequestedRange() throws {
        let local = try repository()
        let original = try occurrences(local)[1]
        let moved = LocalEventExpansion.copy(original, schedule: .timed(.init(
            end: "2026-02-01T11:00:00.000Z", kind: "timed", start: "2026-02-01T10:00:00.000Z", timeZone: "UTC")))
        try local.put(.init(id: original.id, event: moved, isDemo: false))
        let events = try local.events(intersectingStart: "2026-01-08T00:00:00.000Z", end: "2026-01-09T00:00:00.000Z")
        XCTAssertTrue(CalendarEventViewModel.gridInputs(from: events).timedEvents.isEmpty)
        XCTAssertEqual(try occurrences(local).count, 3)
    }

    func testWholeSeriesEditShiftsMasterInsteadOfMovingItToSelectedOccurrence() throws {
        let local = try repository()
        let original = try occurrences(local)[1]
        let schedule = EventSchedule.timed(.init(end: "2026-01-08T12:00:00.000Z", kind: "timed",
            start: "2026-01-08T11:00:00.000Z", timeZone: "UTC"))
        let edited = LocalEventExpansion.copy(original, schedule: schedule)
        XCTAssertTrue(try local.replaceOccurrence(id: original.id, input: input(schedule, scope: .all), edited: edited))
        let starts = try occurrences(local).compactMap { LocalOccurrenceKey.start($0.schedule) }.sorted()
        XCTAssertEqual(starts.first, LocalOccurrenceKey.instant("2026-01-01T11:00:00.000Z"))
        XCTAssertEqual(starts.count, 3)
        XCTAssertEqual(try local.fetchAll().count, 1)
    }

    func testFollowingEditCreatesIndependentNestedSeriesAndDeletionTruncatesIt() throws {
        let local = try repository()
        let selected = try occurrences(local)[1]
        XCTAssertTrue(try local.replaceOccurrence(id: selected.id, input: input(selected.schedule, scope: .thisAndFollowing), edited: selected))
        XCTAssertEqual(try local.fetchAll().count, 2)
        let remainder = try occurrences(local).filter {
            if case .occurrence(let payload) = $0.recurrence { return payload.seriesId == selected.id }
            return false
        }.sorted { $0.id.rawValue < $1.id.rawValue }
        XCTAssertEqual(remainder.count, 3)
        XCTAssertTrue(remainder[0].id.rawValue.hasPrefix(selected.id.rawValue + "::"))
        XCTAssertTrue(try local.deleteOccurrence(id: remainder[1].id, scope: .thisAndFollowing))
        XCTAssertEqual(try occurrences(local).count, 2)
    }

    func testSingleEditDoesNotChangeSiblingsAndWholeSeriesDeletionRemovesOverride() throws {
        let local = try repository()
        let original = try occurrences(local)[1]
        let edited = LocalEventExpansion.copy(original,
            content: .details(.init(description: "", kind: "details", title: "Exception")))
        XCTAssertTrue(try local.replaceOccurrence(id: original.id, input: input(edited.schedule, scope: .this), edited: edited))
        let events = try occurrences(local)
        XCTAssertEqual(events.count, 3)
        XCTAssertEqual(events.filter { if case .details(let value) = $0.content { return value.title == "Exception" }; return false }.count, 1)
        XCTAssertEqual(try local.fetchAll().count, 2)
        XCTAssertTrue(try local.deleteOccurrence(id: original.id, scope: .all))
        XCTAssertTrue(try local.fetchAll().isEmpty)
        XCTAssertTrue(try occurrences(local).isEmpty)
    }

    func testAllDayDatesAndDemoFlagsIgnoreDisplayTimezone() throws {
        let previous = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = previous }
        EffectiveTimeZone.identifier = "Asia/Tokyo"
        let local = try repository(schedule: .allDay(.init(end: "2026-03-09", kind: "allDay", start: "2026-03-07")), isDemo: true)
        let events = try occurrences(local).sorted { $0.id.rawValue < $1.id.rawValue }
        XCTAssertEqual(events.map(\.schedule), [7, 14, 21].map {
            .allDay(.init(end: String(format: "2026-03-%02d", $0 + 2), kind: "allDay", start: String(format: "2026-03-%02d", $0)))
        })
        XCTAssertEqual(try local.demoEventIds().count, 4)
        XCTAssertEqual(try local.fetchAll().count, 1)
    }

    func testTimedSeriesPreservesWallClockAcrossDSTAndMetadata() throws {
        let local = try repository(schedule: .timed(.init(end: "2026-03-01T18:00:00.000Z", kind: "timed",
            start: "2026-03-01T17:00:00.000Z", timeZone: "America/Denver")))
        let events = try occurrences(local).sorted { $0.id.rawValue < $1.id.rawValue }
        XCTAssertEqual(events.compactMap { LocalOccurrenceKey.start($0.schedule) }.map(LocalOccurrenceKey.string),
            ["2026-03-01T17:00:00.000Z", "2026-03-08T16:00:00.000Z", "2026-03-15T16:00:00.000Z"])
        XCTAssertTrue(events.allSatisfy { $0.icalUid == "local-series" && $0.popupReminderMinutes == [10] })
    }

    private func repository(schedule: EventSchedule? = nil, isDemo: Bool = false) throws -> LocalEventRepository {
        let local = LocalEventRepository(database: try .inMemory())
        let sample = try StoreSampleEvents.timedEvent(id: "weekly")
        let series = Event(calendarId: sample.calendarId, content: sample.content, createdAt: sample.createdAt,
            icalUid: "local-series", id: sample.id, popupReminderMinutes: [10],
            recurrence: .series(.init(kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"])),
            schedule: schedule ?? sample.schedule, updatedAt: sample.updatedAt)
        try local.put(.init(id: series.id, event: series, isDemo: isDemo))
        return local
    }

    private func occurrences(_ local: LocalEventRepository) throws -> [Event] {
        try local.expandedRecords().map(\.event).filter {
            if case .occurrence = $0.recurrence { return true }
            return false
        }.sorted { $0.id.rawValue < $1.id.rawValue }
    }

    private func input(_ schedule: EventSchedule, scope: ScopeEnum) -> ReplaceEventInput {
        ReplaceEventInput(content: .init(description: "", kind: "details", location: "", title: "Edited"),
            recurrence: .preserve(.init(kind: "preserve")), schedule: schedule, scope: scope)
    }
}
