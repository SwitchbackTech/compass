import CompassKit
import XCTest
@testable import CompassData

final class GridEventDraftTimeZoneTests: XCTestCase {
    func testEditingTitleInAnotherDisplayTimezonePreservesEventTimezoneAndInstants() throws {
        let previous = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = previous }
        EffectiveTimeZone.identifier = "Pacific/Auckland"
        let event = try originalEvent()
        var draft = try XCTUnwrap(GridEventDraftFromEvent.editDraft(from: event))
        draft.title = "Updated title"
        let input = try XCTUnwrap(GridEventDraftMapping.replaceInput(from: draft, originalCalendarId: event.calendarId, scope: .all))
        let optimistic = try XCTUnwrap(GridEventDraftMapping.optimisticEvent(from: draft, baseline: event))
        for schedule in [input.schedule, optimistic.schedule] {
            guard case .timed(let timed) = schedule else { return XCTFail("Expected timed schedule") }
            XCTAssertEqual(timed.timeZone.rawValue, "America/Denver")
            XCTAssertEqual(CompassDateParsing.parseInEffectiveTimeZone(timed.start.rawValue),
                CompassDateParsing.parseInEffectiveTimeZone("2026-03-01T17:00:00.000Z"))
        }
    }

    func testDuplicateRetainsSourceTimezoneWhileNewDraftUsesDisplayTimezone() throws {
        let previous = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = previous }
        EffectiveTimeZone.identifier = "Pacific/Auckland"
        let event = try originalEvent()
        var duplicate = try XCTUnwrap(GridEventDraftFromEvent.duplicateDraft(from: event, calendars: []))
        duplicate.calendarId = event.calendarId
        let duplicateInput = try XCTUnwrap(GridEventDraftMapping.createInput(from: duplicate))
        guard case .timed(let copied) = duplicateInput.schedule else { return XCTFail("Expected timed duplicate") }
        XCTAssertEqual(copied.timeZone.rawValue, "America/Denver")
        let fresh = GridEventDraft(clientId: "new", schedule: duplicate.schedule, calendarId: event.calendarId)
        let freshInput = try XCTUnwrap(GridEventDraftMapping.createInput(from: fresh))
        guard case .timed(let created) = freshInput.schedule else { return XCTFail("Expected timed creation") }
        XCTAssertEqual(created.timeZone.rawValue, "Pacific/Auckland")
    }

    private func originalEvent() throws -> Event {
        let sample = try StoreSampleEvents.timedEvent(id: "timezone")
        return Event(calendarId: sample.calendarId, content: sample.content, createdAt: sample.createdAt,
            id: sample.id, recurrence: .series(.init(kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"])),
            schedule: .timed(.init(end: "2026-03-01T18:00:00.000Z", kind: "timed",
                start: "2026-03-01T17:00:00.000Z", timeZone: "America/Denver")), updatedAt: sample.updatedAt)
    }
}
