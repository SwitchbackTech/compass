import CompassKit
import XCTest

final class CalendarEventViewModelTests: XCTestCase {
    func testTimedEventMapsToGridInput() throws {
        let json = """
        {
          "id": "evt-1",
          "calendarId": "507f1f77bcf86cd799439011",
          "content": { "kind": "details", "title": "Standup", "description": "" },
          "createdAt": "2026-06-10T15:00:00.000Z",
          "updatedAt": null,
          "recurrence": { "kind": "single" },
          "schedule": {
            "kind": "timed",
            "start": "2026-06-10T09:00:00+00:00",
            "end": "2026-06-10T09:30:00+00:00",
            "timeZone": "UTC"
          }
        }
        """
        EffectiveTimeZone.identifier = "UTC"
        let event = try JSONDecoder().decode(Event.self, from: Data(json.utf8))
        let inputs = CalendarEventViewModel.gridInputs(from: [event])
        XCTAssertEqual(inputs.timedEvents.count, 1)
        XCTAssertEqual(inputs.timedEvents[0].title, "Standup")
    }

    /// Regression: grid cards drew without their color because the slot and
    /// provider hex never reached the layout inputs (web `resolveEventPalette`).
    func testEventColorReachesTimedAndAllDayInputs() throws {
        EffectiveTimeZone.identifier = "UTC"
        let timed = try decodeEvent(
            id: "slot",
            content: ##"{ "kind": "details", "title": "Gym", "description": "", "color": "green" }"##,
            schedule: ##"{ "kind": "timed", "start": "2026-06-10T09:00:00+00:00", "end": "2026-06-10T10:00:00+00:00", "timeZone": "UTC" }"##)
        let provider = try decodeEvent(
            id: "hex",
            content: ##"{ "kind": "details", "title": "Synced", "description": "", "color": "green", "colorHex": "#123456" }"##,
            schedule: ##"{ "kind": "timed", "start": "2026-06-10T11:00:00+00:00", "end": "2026-06-10T12:00:00+00:00", "timeZone": "UTC" }"##)
        let plain = try decodeEvent(
            id: "plain",
            content: ##"{ "kind": "details", "title": "Lunch", "description": "" }"##,
            schedule: ##"{ "kind": "timed", "start": "2026-06-10T13:00:00+00:00", "end": "2026-06-10T14:00:00+00:00", "timeZone": "UTC" }"##)
        let allDay = try decodeEvent(
            id: "all-day",
            content: ##"{ "kind": "details", "title": "Deep work day", "description": "", "color": "lavender" }"##,
            schedule: ##"{ "kind": "allDay", "start": "2026-06-10", "end": "2026-06-11" }"##)

        let inputs = CalendarEventViewModel.gridInputs(from: [timed, provider, plain, allDay])
        let colorById = Dictionary(uniqueKeysWithValues: inputs.timedEvents.map { ($0.eventId, $0.colorHex) })

        XCTAssertEqual(colorById["slot"], "#0B8043")
        XCTAssertEqual(colorById["hex"], "#123456")
        XCTAssertEqual(colorById["plain"], .some(nil))
        XCTAssertEqual(inputs.allDayEvents.map(\.colorHex), ["#7986CB"])
    }

    private func decodeEvent(id: String, content: String, schedule: String) throws -> Event {
        let json = """
        {
          "id": "\(id)",
          "calendarId": "507f1f77bcf86cd799439011",
          "content": \(content),
          "createdAt": "2026-06-10T15:00:00.000Z",
          "updatedAt": null,
          "recurrence": { "kind": "single" },
          "schedule": \(schedule)
        }
        """
        return try JSONDecoder().decode(Event.self, from: Data(json.utf8))
    }
}
