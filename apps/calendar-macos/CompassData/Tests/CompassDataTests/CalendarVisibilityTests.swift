import CompassData
import CompassKit
import XCTest

@MainActor
final class CalendarVisibilityTests: XCTestCase {
    private let hiddenIdsKey = "compass.calendars.hidden-ids"

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: hiddenIdsKey)
        super.tearDown()
    }

    func testHiddenIdsPersistAcrossStores() {
        let defaults = UserDefaults(suiteName: "CalendarVisibilityTests.persist")!
        defaults.removePersistentDomain(forName: "CalendarVisibilityTests.persist")
        let store = CalendarVisibilityStore(defaults: defaults)
        XCTAssertTrue(store.isVisible("work"))
        store.setVisible("work", false)
        XCTAssertFalse(CalendarVisibilityStore(defaults: defaults).isVisible("work"))
        store.setVisible("work", true)
        XCTAssertTrue(CalendarVisibilityStore(defaults: defaults).isVisible("work"))
    }

    func testHidingCalendarRemovesItsEventsFromGrid() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        model.updateContentTrackWidth(400)

        let cardCount = {
            let widths = model.timeGridState.resolvedColumnWidths()
            return model.timeGridState.snapshot(colWidths: widths).cards.count
        }
        XCTAssertGreaterThan(cardCount(), 0)
        let calendar = try XCTUnwrap(model.sidebarCalendars.first { $0.id == fixture.calendarId })

        model.toggleCalendarVisibility(calendar)
        XCTAssertEqual(cardCount(), 0)
        XCTAssertTrue(model.visibleCalendars().isEmpty)
        XCTAssertEqual(model.sidebarCalendars.map(\.id), [fixture.calendarId])
        XCTAssertEqual(model.statusToastStore.message, "Hidden \(calendar.name) calendar")

        model.toggleCalendarVisibility(calendar)
        XCTAssertGreaterThan(cardCount(), 0)
    }
}
