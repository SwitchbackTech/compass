import CompassKit
import XCTest

final class QuickTimeTests: XCTestCase {
    override func setUp() {
        super.setUp()
        EffectiveTimeZone.identifier = "UTC"
    }

    func testFocusedColumnDayFromJumpSelection() {
        let day = QuickTime.quickTimeFocusedColumnDay(activeDayKeys: ["2026-05-18"])
        XCTAssertNotNil(day)
        XCTAssertEqual(CompassDateParsing.formatCalendarDay(day!), "2026-05-18")
        XCTAssertNil(QuickTime.quickTimeFocusedColumnDay(activeDayKeys: []))
    }

    func testResolveNoonFromTwoDigits() {
        let day = CompassDateParsing.calendarDateInEffectiveTimeZone("2026-05-20")!
        let start = QuickTime.resolveQuickTimeStart(digits: "12", targetDay: day)
        XCTAssertNotNil(start)
        let calendar = EffectiveTimeZone.calendar
        XCTAssertEqual(calendar.component(.hour, from: start!), 12)
        XCTAssertEqual(calendar.component(.minute, from: start!), 0)
    }

    func testResolveTimeFromFourDigits() {
        let day = CompassDateParsing.calendarDateInEffectiveTimeZone("2026-05-20")!
        let start = QuickTime.resolveQuickTimeStart(digits: "1130", targetDay: day)
        XCTAssertNotNil(start)
        let calendar = EffectiveTimeZone.calendar
        XCTAssertEqual(calendar.component(.hour, from: start!), 11)
        XCTAssertEqual(calendar.component(.minute, from: start!), 30)
    }
}
