import CompassKit
import XCTest

final class DayJumpKeyAssignmentTests: XCTestCase {
    func testAssignsWeekdayPrefixesAndPerDayIndices() {
        let assignments = DayJumpKeyAssignment.assign([
            .init(
                eventId: "wed-2", startMs: 200, eventType: .timed, dayKey: "2026-08-05", weekday: 3),
            .init(
                eventId: "wed-1", startMs: 100, eventType: .timed, dayKey: "2026-08-05", weekday: 3),
            .init(
                eventId: "mon-1", startMs: 50, eventType: .timed, dayKey: "2026-08-03", weekday: 1),
        ])
        XCTAssertEqual(assignments.map(\.hint), ["m1", "w1", "w2"])
    }

    func testMatchFocusesWithDayPrefixAndIndex() {
        let assignments = DayJumpKeyAssignment.assign([
            .init(
                eventId: "fri-4", startMs: 400, eventType: .timed, dayKey: "2026-08-07", weekday: 5),
            .init(
                eventId: "fri-1", startMs: 100, eventType: .timed, dayKey: "2026-08-07", weekday: 5),
        ])
        let map = ["f": "2026-08-07"]
        let match = DayJumpKeyAssignment.matchKeystroke(
            assignments: assignments, dayKeyByPrefix: map, key: "4", buffer: "f")
        XCTAssertEqual(match, .focus(eventId: "fri-4", dayKey: "2026-08-07", buffer: "f4"))
    }

    func testWeekendDisambiguationFromS() {
        let assignments = DayJumpKeyAssignment.assign([
            .init(
                eventId: "sun", startMs: 1, eventType: .timed, dayKey: "2026-08-02", weekday: 0),
        ])
        let map = ["su": "2026-08-02", "sa": "2026-08-08"]
        let first = DayJumpKeyAssignment.matchKeystroke(
            assignments: assignments, dayKeyByPrefix: map, key: "s", buffer: "")
        XCTAssertEqual(
            first,
            .prefix(buffer: "s", dayKeys: ["2026-08-02"], pendingExactEventId: nil))
        let second = DayJumpKeyAssignment.matchKeystroke(
            assignments: assignments, dayKeyByPrefix: map, key: "u", buffer: "s")
        XCTAssertEqual(
            second,
            .selectDay(dayPrefix: "su", dayKey: "2026-08-02", firstEventId: "sun", buffer: "su"))
    }
}
