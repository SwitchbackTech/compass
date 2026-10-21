import CompassKit
import XCTest

final class UpNextProjectionTests: XCTestCase {
    private var priorTimeZone: String!

    override func setUp() {
        super.setUp()
        priorTimeZone = EffectiveTimeZone.identifier
        EffectiveTimeZone.identifier = "America/Denver"
    }

    override func tearDown() {
        EffectiveTimeZone.identifier = priorTimeZone
        super.tearDown()
    }

    func testFilterGridVisibleEventsDropsHiddenIdsAndCalendars() throws {
        let visible = try decodeEvent(id: "visible", calendarId: "cal-on")
        let hiddenId = try decodeEvent(id: "hidden-id", calendarId: "cal-on")
        let hiddenCal = try decodeEvent(id: "other", calendarId: "cal-off")

        let filtered = UpNextProjection.filterGridVisibleEvents(
            [visible, hiddenId, hiddenCal],
            hiddenEventIds: ["hidden-id"],
            isCalendarVisible: { $0 == "cal-on" })

        XCTAssertEqual(filtered.map(\.id.rawValue), ["visible"])
    }

    func testSnapshotUsesNextVisibleCurrentEventAfterHiddenFilteredOut() throws {
        let now = isoDate("2026-03-10T15:00:00.000Z")
        let hidden = try decodeEvent(
            id: "hidden",
            calendarId: "cal",
            title: "Flight",
            start: "2026-03-10T14:50:00.000-06:00",
            end: "2026-03-10T16:00:00.000-06:00")
        let visible = try decodeEvent(
            id: "visible",
            calendarId: "cal",
            title: "Write",
            start: "2026-03-10T14:55:00.000-06:00",
            end: "2026-03-10T16:30:00.000-06:00")

        let eligible = UpNextProjection.filterGridVisibleEvents(
            [hidden, visible],
            hiddenEventIds: ["hidden"],
            isCalendarVisible: { _ in true })
        let candidates = UpNextProjection.timedCandidates(from: eligible)
        let snapshot = UpNextProjection.snapshot(now: now, timedCandidates: candidates)

        XCTAssertEqual(snapshot.upNext?.title, "Write")
        XCTAssertTrue(snapshot.isCurrentEvent)
    }

    func testSnapshotEmptyWhenAllCandidatesFilteredOut() {
        let now = isoDate("2026-03-10T15:00:00.000Z")
        let snapshot = UpNextProjection.snapshot(now: now, timedCandidates: [])
        XCTAssertNil(snapshot.upNext)
        XCTAssertFalse(snapshot.isCurrentEvent)
    }

    private func decodeEvent(
        id: String,
        calendarId: String,
        title: String = "Event",
        start: String? = nil,
        end: String? = nil
    ) throws -> Event {
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = EffectiveTimeZone.timeZone
        let startDate = start.map { formatter.date(from: $0) ?? Date() } ?? Date()
        let endDate = end.map { formatter.date(from: $0) ?? startDate.addingTimeInterval(3600) }
            ?? startDate.addingTimeInterval(3600)
        let json = """
        {
          "id": "\(id)",
          "calendarId": "\(calendarId)",
          "content": { "kind": "details", "title": "\(title)", "description": "" },
          "createdAt": "2026-06-10T15:00:00.000Z",
          "updatedAt": null,
          "recurrence": { "kind": "single" },
          "schedule": {
            "kind": "timed",
            "start": "\(formatter.string(from: startDate))",
            "end": "\(formatter.string(from: endDate))",
            "timeZone": "\(EffectiveTimeZone.identifier)"
          }
        }
        """
        return try JSONDecoder().decode(Event.self, from: Data(json.utf8))
    }

    private func isoDate(_ string: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: string)
            ?? ISO8601DateFormatter().date(from: string)!
    }
}
