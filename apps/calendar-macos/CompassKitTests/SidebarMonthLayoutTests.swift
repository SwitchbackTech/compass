import CompassKit
import XCTest

final class SidebarMonthLayoutTests: XCTestCase {
    private func calendar(_ zone: String = "America/Denver") -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: zone)!
        return calendar
    }

    private func date(_ year: Int, _ month: Int, _ day: Int, calendar: Calendar) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day))!
    }

    func testSixRowMonthIncludesAdjacentDates() {
        let calendar = calendar()
        let days = SidebarMonthLayout.days(in: date(2026, 5, 15, calendar: calendar), weekStart: 1, calendar: calendar)
        XCTAssertEqual(days.count, 42)
        XCTAssertEqual(days.first, date(2026, 4, 26, calendar: calendar))
        XCTAssertEqual(days.last, date(2026, 6, 6, calendar: calendar))
        XCTAssertEqual(Set(days).count, days.count)
    }

    func testShiftedWeekStartsOnVisibleWindowsWeekday() {
        let calendar = calendar()
        let days = SidebarMonthLayout.days(in: date(2026, 10, 15, calendar: calendar), weekStart: 5, calendar: calendar)
        XCTAssertEqual(days.count, 35)
        XCTAssertEqual(days.first, date(2026, 10, 1, calendar: calendar))
        XCTAssertEqual(days.last, date(2026, 11, 4, calendar: calendar))
    }

    func testDaysStayAtLocalMidnightAcrossDaylightSaving() {
        for zone in ["America/Denver", "Pacific/Auckland"] {
            let calendar = calendar(zone)
            let days = SidebarMonthLayout.days(in: date(2026, 3, 15, calendar: calendar), weekStart: 1, calendar: calendar)
            XCTAssertTrue(days.allSatisfy { calendar.component(.hour, from: $0) == 0 })
            for pair in zip(days, days.dropFirst()) {
                XCTAssertEqual(calendar.dateComponents([.day], from: pair.0, to: pair.1).day, 1)
            }
        }
    }

    func testLeapFebruaryAndYearBoundary() {
        let calendar = calendar("UTC")
        let leapDays = SidebarMonthLayout.days(in: date(2028, 2, 1, calendar: calendar), weekStart: 1, calendar: calendar)
        XCTAssertTrue(leapDays.contains(date(2028, 2, 29, calendar: calendar)))
        let january = SidebarMonthLayout.days(in: date(2027, 1, 1, calendar: calendar), weekStart: 1, calendar: calendar)
        XCTAssertEqual(january.first, date(2026, 12, 27, calendar: calendar))
        XCTAssertEqual(january.last, date(2027, 2, 6, calendar: calendar))
    }
}
