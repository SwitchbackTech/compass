import CompassKit
import XCTest

final class MonthPickerCursorTests: XCTestCase {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Denver")!
        return calendar
    }

    private func date(_ month: Int, _ day: Int, year: Int = 2026) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day))!
    }

    func testDayMonthJumpClampsJanuary31ToFebruary28() {
        XCTAssertEqual(MonthPickerCursor.jump(
            from: date(1, 31), to: date(2, 1), isWeek: false, weekStart: 1, calendar: calendar), date(2, 28))
    }

    func testWeekMonthJumpKeepsWeekStartInsideTargetMonth() {
        XCTAssertEqual(MonthPickerCursor.jump(
            from: date(5, 3), to: date(6, 1), isWeek: true, weekStart: 1, calendar: calendar), date(6, 7))
    }

    func testShiftedWeekCursorUsesVisibleWindowsStartDay() {
        XCTAssertEqual(MonthPickerCursor.jump(
            from: date(5, 12), to: date(6, 1), isWeek: true, weekStart: 3, calendar: calendar), date(6, 9))
    }

    func testLeapDayAndYearBoundary() {
        XCTAssertEqual(MonthPickerCursor.jump(
            from: date(1, 31, year: 2028), to: date(2, 1, year: 2028),
            isWeek: false, weekStart: 1, calendar: calendar), date(2, 29, year: 2028))
        XCTAssertEqual(MonthPickerCursor.jump(
            from: date(12, 31), to: date(1, 1, year: 2027),
            isWeek: false, weekStart: 1, calendar: calendar), date(1, 31, year: 2027))
    }
}
