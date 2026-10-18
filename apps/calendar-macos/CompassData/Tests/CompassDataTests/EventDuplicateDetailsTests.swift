import CompassKit
import XCTest
@testable import CompassData

final class EventDuplicateDetailsTests: XCTestCase {
    func testKeyboardDuplicateKeepsColorInTheRequestAndOptimisticEvent() throws {
        let source = try coloredSeries()
        let input = try XCTUnwrap(EventDuplicateCommit.duplicateInput(from: source, calendars: [],
            defaultCalendarId: source.calendarId))
        XCTAssertEqual(input.content.color?.rawValue, "red")
        let optimistic = try XCTUnwrap(EventDuplicateCommit.optimisticEvent(from: input))
        guard case .details(let details) = optimistic.content else { return XCTFail("Expected details") }
        XCTAssertEqual(details.color?.rawValue, "red")
        XCTAssertNotEqual(optimistic.id, source.id)
        XCTAssertEqual(optimistic.schedule, source.schedule)
    }

    func testFormDuplicateKeepsTheSeriesRules() throws {
        let source = try coloredSeries()
        var draft = try XCTUnwrap(GridEventDraftFromEvent.duplicateDraft(from: source, calendars: []))
        draft.calendarId = source.calendarId
        let input = try XCTUnwrap(GridEventDraftMapping.createInput(from: draft))
        guard case .series(let recurrence) = input.recurrence else { return XCTFail("Expected recurring copy") }
        XCTAssertEqual(recurrence.rules, ["RRULE:FREQ=WEEKLY;COUNT=3"])
    }

    func testDuplicatingAnOccurrenceCreatesAStandaloneCopy() throws {
        let series = try coloredSeries()
        let occurrence = Event(calendarId: series.calendarId, content: series.content,
            createdAt: series.createdAt, id: "occurrence",
            recurrence: .occurrence(.init(kind: "occurrence", seriesId: series.id)),
            schedule: series.schedule, updatedAt: series.updatedAt)
        let draft = try XCTUnwrap(GridEventDraftFromEvent.duplicateDraft(from: occurrence, calendars: []))
        XCTAssertEqual(draft.recurrence, .single)
        let input = try XCTUnwrap(EventDuplicateCommit.duplicateInput(from: occurrence, calendars: [],
            defaultCalendarId: series.calendarId))
        guard case .single = input.recurrence else { return XCTFail("Expected standalone copy") }
    }

    private func coloredSeries() throws -> Event {
        let sample = try StoreSampleEvents.timedEvent(id: "colored-series")
        return Event(calendarId: sample.calendarId,
            content: .details(.init(color: .red, description: "Notes", kind: "details", title: "Colored series")),
            createdAt: sample.createdAt, id: sample.id,
            recurrence: .series(.init(kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"])),
            schedule: sample.schedule, updatedAt: sample.updatedAt)
    }
}
