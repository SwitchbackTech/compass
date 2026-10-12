import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelCalendarListTests: XCTestCase {
    private var model: NativeCalendarRootModel!

    override func setUp() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
    }

    override func tearDown() async throws {
        for group in model.calendarListGroups where model.isAccountCollapsed(group.id) {
            model.toggleAccountCollapsed(group.id)
        }
        for calendar in model.sidebarCalendars {
            model.calendarVisibilityStore.setVisible(calendar.id, true)
        }
        model = nil
    }

    private func firstCalendar() throws -> CompassCalendar {
        try XCTUnwrap(model.calendarListGroups.first?.calendars.first)
    }

    func testNumberKeyTogglesRowInFocusedList() throws {
        let calendar = try firstCalendar()
        XCTAssertFalse(model.pickCalendar(key: "1"), "No list has focus yet")

        model.focusCalendarList()

        XCTAssertEqual(model.calendarPickKey(groupKey: model.calendarListGroups[0].id, index: 0), "1")
        XCTAssertTrue(model.pickCalendar(key: "1"))
        XCTAssertFalse(model.calendarVisibilityStore.isVisible(calendar.id))
        XCTAssertFalse(model.pickCalendar(key: "="), "Key past the last row does nothing")
    }

    func testCollapsedListIgnoresNumberKeys() throws {
        let calendar = try firstCalendar()
        let key = model.calendarListGroups[0].id
        model.toggleAccountCollapsed(key)
        model.focusCalendarList(key)

        XCTAssertTrue(model.isAccountCollapsed(key))
        XCTAssertFalse(model.pickCalendar(key: "1"))
        XCTAssertTrue(model.calendarVisibilityStore.isVisible(calendar.id))
    }

    func testUndoRestoresCalendarVisibility() async throws {
        let calendar = try firstCalendar()
        model.toggleCalendarVisibility(calendar)
        XCTAssertFalse(model.calendarVisibilityStore.isVisible(calendar.id))

        await model.undoLastChangeAndWait()

        XCTAssertTrue(model.calendarVisibilityStore.isVisible(calendar.id))
        XCTAssertTrue(model.undoStore.canRedo)
    }
}
