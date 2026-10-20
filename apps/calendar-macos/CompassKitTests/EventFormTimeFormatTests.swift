import XCTest
@testable import CompassKit

final class EventFormTimeFormatTests: XCTestCase {
    override func setUp() {
        super.setUp()
        EffectiveTimeZone.identifier = "UTC"
    }

    func testFormatLabelStripsOnTheHourMinutes() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let date = try XCTUnwrap(calendar.date(from: DateComponents(
            timeZone: TimeZone(identifier: "UTC"),
            year: 2026, month: 6, day: 10, hour: 15, minute: 0
        )))
        XCTAssertEqual(EventFormTimeFormat.formatLabel(for: date), "3 PM")
    }

    func testMergeTimeUpdatesDayPortion() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let schedule = try XCTUnwrap(calendar.date(from: DateComponents(
            timeZone: TimeZone(identifier: "UTC"),
            year: 2026, month: 6, day: 10, hour: 9, minute: 0
        )))
        let merged = try XCTUnwrap(EventFormTimeFormat.mergeTime(into: schedule, label: "4:30 PM"))
        let parts = calendar.dateComponents([.hour, .minute, .day], from: merged)
        XCTAssertEqual(parts.day, 10)
        XCTAssertEqual(parts.hour, 16)
        XCTAssertEqual(parts.minute, 30)
    }
}
