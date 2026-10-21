import CompassKit
import XCTest
@testable import CompassUI

final class EventFormDatePickTests: XCTestCase {
    private var savedZone = "UTC"

    override func setUp() {
        savedZone = EffectiveTimeZone.identifier
        EffectiveTimeZone.identifier = "America/Denver"
    }

    override func tearDown() {
        EffectiveTimeZone.identifier = savedZone
    }

    private func date(_ day: Int, hour: Int, minute: Int) -> Date {
        var parts = DateComponents()
        parts.year = 2026
        parts.month = 6
        parts.day = day
        parts.hour = hour
        parts.minute = minute
        return EffectiveTimeZone.calendar.date(from: parts)!
    }

    func testPickingADayKeepsTheTimeOfDay() {
        let original = date(10, hour: 15, minute: 45)
        let picked = date(22, hour: 0, minute: 0)
        let result = EventFormCompactDateField.keepingTime(of: original, onDayOf: picked)
        XCTAssertEqual(result, date(22, hour: 15, minute: 45))
    }

    func testPickingTheSameDayChangesNothing() {
        let original = date(10, hour: 9, minute: 15)
        XCTAssertEqual(
            EventFormCompactDateField.keepingTime(of: original, onDayOf: date(10, hour: 0, minute: 0)),
            original)
    }
}
