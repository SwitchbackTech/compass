import CompassKit
import XCTest

/// Web `EventFormDateField.handleKeyDown` on the closed field.
final class EventFormDateFieldKeysTests: XCTestCase {
    private var savedTimeZone = ""
    private var committed = Date()

    override func setUpWithError() throws {
        try super.setUpWithError()
        savedTimeZone = EffectiveTimeZone.identifier
        EffectiveTimeZone.identifier = "UTC"
        committed = try XCTUnwrap(CompassDateParsing.parseInEffectiveTimeZone("2026-10-17T15:00:00"))
    }

    override func tearDown() {
        EffectiveTimeZone.identifier = savedTimeZone
        super.tearDown()
    }

    private func action(_ key: EventFormDateFieldKeys.Key, _ modifiers: EventFormDateFieldKeys.Modifiers = [], text: String = "10.17.26") -> EventFormDateFieldKeys.Action {
        EventFormDateFieldKeys.action(for: key, modifiers: modifiers, text: text, committedDate: committed)
    }

    func testArrowDownOpensAndModifiedArrowsNudge() {
        XCTAssertEqual(action(.downArrow), .openCalendar)
        XCTAssertEqual(action(.downArrow, .shift), .nudgeDays(7))
        XCTAssertEqual(action(.downArrow, .mod), .nudgeDays(1))
        XCTAssertEqual(action(.upArrow), .nudgeDays(-1))
        XCTAssertEqual(action(.upArrow, .shift), .nudgeDays(-7))
    }

    func testEnterOpensOnlyWhenTheTextIsTheCommittedDay() {
        XCTAssertEqual(action(.enter), .openCalendar)
        XCTAssertEqual(action(.enter, text: "10.18.26"), .ignore)
        XCTAssertEqual(action(.enter, text: "nonsense"), .ignore)
        XCTAssertEqual(action(.enter, .mod), .ignore)
    }

    func testSpaceOpensOnlyOnTheShownDate() {
        XCTAssertEqual(action(.space), .openCalendar)
        XCTAssertEqual(action(.space, text: "10.1"), .ignore)
    }

    func testOpenCalendarKeysMoveTheCursorAndPick() {
        XCTAssertEqual(EventFormDateFieldKeys.calendarAction(for: .leftArrow), .moveCursor(days: -1))
        XCTAssertEqual(EventFormDateFieldKeys.calendarAction(for: .rightArrow), .moveCursor(days: 1))
        XCTAssertEqual(EventFormDateFieldKeys.calendarAction(for: .upArrow), .moveCursor(days: -7))
        XCTAssertEqual(EventFormDateFieldKeys.calendarAction(for: .downArrow), .moveCursor(days: 7))
        XCTAssertEqual(EventFormDateFieldKeys.calendarAction(for: .enter), .pickCursor)
        XCTAssertEqual(EventFormDateFieldKeys.calendarAction(for: .space), .pickCursor)
        XCTAssertEqual(EventFormDateFieldKeys.calendarAction(for: .escape), .close)
    }

    func testTheFormLetsTheDateFieldKeepItsKeys() {
        let closed = EventFormDateFieldKeys.Owner(fieldId: "start", calendarOpen: false)
        let open = EventFormDateFieldKeys.Owner(fieldId: "start", calendarOpen: true)
        let enter = KeyEvent(key: .named(.enter))
        let escape = KeyEvent(key: .named(.escape))
        let right = KeyEvent(key: .named(.arrowRight))
        XCTAssertFalse(EventFormDateFieldKeys.fieldOwnsKey(enter, owner: nil))
        XCTAssertTrue(EventFormDateFieldKeys.fieldOwnsKey(enter, owner: closed))
        XCTAssertFalse(EventFormDateFieldKeys.fieldOwnsKey(escape, owner: closed))
        XCTAssertTrue(EventFormDateFieldKeys.fieldOwnsKey(escape, owner: open))
        XCTAssertTrue(EventFormDateFieldKeys.fieldOwnsKey(right, owner: open))
        // Mod+Enter still saves the form.
        XCTAssertFalse(EventFormDateFieldKeys.fieldOwnsKey(KeyEvent(key: .named(.enter), modifiers: .command), owner: open))
    }
}
