import XCTest

/// Web `EventFormDateField` keys: ↑ nudges the closed field a day, ↓ opens
/// the calendar, and ← → ↑ ↓ then Enter pick a day like `react-datepicker`.
final class EventFormDateKeysTests: XCTestCase {
    @MainActor
    func testArrowUpOnTheClosedFieldMovesBackADay() throws {
        let (_, field) = launchWithStartDateFocused()
        let before = try XCTUnwrap(field.value as? String)
        field.typeKey(.upArrow, modifierFlags: [])
        XCTAssertEqual(field.value as? String, try shifted(before, days: -1))
    }

    @MainActor
    func testArrowDownOpensTheCalendarAndArrowsThenEnterPickADay() throws {
        let (app, field) = launchWithStartDateFocused()
        let before = try XCTUnwrap(field.value as? String)
        field.typeKey(.downArrow, modifierFlags: [])
        let picker = app.descendants(matching: .any)["compass-event-form-date-picker"]
        XCTAssertTrue(picker.waitForExistence(timeout: 5))
        app.typeKey(.rightArrow, modifierFlags: [])
        app.typeKey(.return, modifierFlags: [])
        XCTAssertTrue(picker.waitForNonExistence(timeout: 5))
        XCTAssertEqual(field.value as? String, try shifted(before, days: 1))
    }

    @MainActor
    private func launchWithStartDateFocused() -> (XCUIApplication, XCUIElement) {
        let app = XCUIApplication.compassUITest()
        app.launchArguments += [
            "-COMPASS_FIXTURE", "demo",
            "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT", "demo-morning-standup",
            "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK",
            "-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM",
        ]
        app.launch()
        let window = app.windows["Compass"]
        let field = window.descendants(matching: .any)["compass-event-form-start-date"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.click()
        return (app, field)
    }

    /// The field shows MM.DD.YY; shift it by whole days.
    private func shifted(_ label: String, days: Int) throws -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "MM.dd.yy"
        let date = try XCTUnwrap(formatter.date(from: label))
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return formatter.string(from: try XCTUnwrap(calendar.date(byAdding: .day, value: days, to: date)))
    }
}
