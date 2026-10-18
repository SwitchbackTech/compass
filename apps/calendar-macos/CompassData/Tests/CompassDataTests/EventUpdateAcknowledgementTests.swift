import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class EventUpdateAcknowledgementTests: XCTestCase {
    func testReplaceAcknowledgementCannotOverwriteTheOptimisticEventCalendar() async throws {
        let database = try AppDatabase.inMemory()
        let repository = EventRepository(database: database)
        let api = MockEventsAPI()
        let store = EventsStore(repository: repository, localEvents: LocalEventRepository(database: database),
            rangeCache: RangeCache(database: database), eventsAPI: api)
        let event = try StoreSampleEvents.timedEvent(id: "updated-event")
        let acknowledgement = Event(calendarId: "000000000000000000000000", content: event.content,
            createdAt: event.createdAt, id: event.id, recurrence: event.recurrence,
            schedule: event.schedule, updatedAt: event.updatedAt)
        api.replaceHandler = { _, _ in try StoreSampleEvents.response(from: acknowledgement) }
        let draft = try XCTUnwrap(GridEventDraftFromEvent.editDraft(from: event))
        let input = try XCTUnwrap(GridEventDraftMapping.replaceInput(
            from: draft, originalCalendarId: event.calendarId, scope: .this))
        try await store.replaceOptimistic(id: event.id, input: input, optimisticEvent: event)
        XCTAssertEqual(try repository.fetchAll(), [event])
    }
}
