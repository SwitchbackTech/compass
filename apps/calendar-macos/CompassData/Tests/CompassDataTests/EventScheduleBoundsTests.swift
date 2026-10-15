import CompassKit
import XCTest
@testable import CompassData

final class EventScheduleBoundsTests: XCTestCase {
    private var savedZone = ""

    override func setUp() {
        super.setUp()
        savedZone = EffectiveTimeZone.identifier
        EffectiveTimeZone.identifier = "America/Denver"
    }

    override func tearDown() {
        EffectiveTimeZone.identifier = savedZone
        super.tearDown()
    }

    /// Regression: Up next said "All clear" for an evening event stored in UTC
    /// because "2026-10-16T01:10Z" sorts after "2026-10-16T00:00-06:00" as text.
    func testUTCStoredEveningEventIntersectsLocalOffsetRange() throws {
        let event = try timedEvent(start: "2026-10-16T01:10:00.000Z", end: "2026-10-16T01:40:00.000Z")

        XCTAssertTrue(EventScheduleBounds.intersectsQueryRange(
            event: event,
            start: "2026-10-15T00:00:00-06:00",
            end: "2026-10-16T00:15:00-06:00"))
    }

    func testEventAfterTheRangeDoesNotIntersect() throws {
        let event = try timedEvent(start: "2026-10-16T07:00:00.000Z", end: "2026-10-16T08:00:00.000Z")

        XCTAssertFalse(EventScheduleBounds.intersectsQueryRange(
            event: event,
            start: "2026-10-15T00:00:00-06:00",
            end: "2026-10-16T00:15:00-06:00"))
    }

    private func timedEvent(start: String, end: String) throws -> Event {
        let json = """
        {
          "id": "evening",
          "calendarId": "507f1f77bcf86cd799439011",
          "content": { "kind": "details", "title": "Dinner", "description": "" },
          "createdAt": "2026-10-15T15:00:00.000Z",
          "updatedAt": null,
          "recurrence": { "kind": "single" },
          "schedule": { "kind": "timed", "start": "\(start)", "end": "\(end)", "timeZone": "UTC" }
        }
        """
        return try JSONDecoder().decode(Event.self, from: Data(json.utf8))
    }
}
