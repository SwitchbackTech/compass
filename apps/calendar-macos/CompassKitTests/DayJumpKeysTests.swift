import CompassKit
import XCTest

/// Web `assign-shift-hint-keys.test.ts`: day prefix plus per-day index.
final class DayJumpKeysTests: XCTestCase {
    private let wednesday = "2026-06-10"
    private let sunday = "2026-06-07"

    private func target(_ id: String, day: String, weekday: Int, hour: Int, allDay: Bool = false) -> DayJumpKeys.Target {
        let start = CompassDateParsing.calendarDateInEffectiveTimeZone(day)!.addingTimeInterval(Double(hour) * 3600)
        return DayJumpKeys.Target(eventId: id, start: start, isAllDay: allDay, dayKey: day, weekday: weekday)
    }

    func testAssignsDayPrefixAndChronologicalIndex() {
        let assignments = DayJumpKeys.assign([
            target("late", day: wednesday, weekday: 3, hour: 15),
            target("early", day: wednesday, weekday: 3, hour: 9),
            target("sun", day: sunday, weekday: 0, hour: 12),
        ])
        XCTAssertEqual(assignments.map(\.hint), ["su1", "w1", "w2"])
        XCTAssertEqual(assignments.map(\.eventId), ["sun", "early", "late"])
    }

    func testAllDaySortsBeforeTimedAtTheSameStart() {
        let assignments = DayJumpKeys.assign([
            target("timed", day: wednesday, weekday: 3, hour: 0),
            target("all-day", day: wednesday, weekday: 3, hour: 0, allDay: true),
        ])
        XCTAssertEqual(assignments.map(\.eventId), ["all-day", "timed"])
    }

    func testDigitFocusesWhenNoLongerHintSharesIt() {
        let assignments = DayJumpKeys.assign([
            target("a", day: wednesday, weekday: 3, hour: 9),
            target("b", day: wednesday, weekday: 3, hour: 10),
        ])
        XCTAssertEqual(DayJumpKeys.matchDigit(assignments, next: "w2"), .focus(eventId: "b", buffer: "w2"))
        XCTAssertEqual(DayJumpKeys.matchDigit(assignments, next: "w9"), .none)
    }

    func testDigitWaitsWhenALongerHintSharesIt() {
        let assignments = DayJumpKeys.assign((0 ..< 10).map { index in
            target("e\(index)", day: wednesday, weekday: 3, hour: index)
        })
        XCTAssertEqual(DayJumpKeys.matchDigit(assignments, next: "w1"), .prefix(buffer: "w1", exactEventId: "e0"))
        XCTAssertEqual(DayJumpKeys.matchDigit(assignments, next: "w10"), .focus(eventId: "e9", buffer: "w10"))
    }
}
