import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelCalendarListTests: XCTestCase {
    private var model: NativeCalendarRootModel!

    override func setUp() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
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

    func testNumberKeyTogglesRowInFocusedList() async throws {
        await model.authStore.bootstrap(forceDemoSignedIn: true)
        let calendar = try firstCalendar()
        XCTAssertFalse(model.pickCalendar(key: "1"), "No list has focus yet")

        model.focusCalendarList()

        XCTAssertEqual(model.calendarPickKey(groupKey: model.calendarListGroups[0].id, index: 0), "1")
        XCTAssertTrue(model.pickCalendar(key: "1"))
        XCTAssertFalse(model.calendarVisibilityStore.isVisible(calendar.id))
        XCTAssertFalse(model.pickCalendar(key: "="), "Key past the last row does nothing")
    }

    func testCollapsedListIgnoresNumberKeys() async throws {
        await model.authStore.bootstrap(forceDemoSignedIn: true)
        let calendar = try firstCalendar()
        let key = model.calendarListGroups[0].id
        model.toggleAccountCollapsed(key)
        model.focusCalendarList(key)

        XCTAssertTrue(model.isAccountCollapsed(key))
        let stored = UserDefaults.standard.stringArray(forKey: "compass.calendars.collapsed-account-digests") ?? []
        XCTAssertFalse(stored.isEmpty)
        XCTAssertFalse(stored.contains(key), "Only digests reach preferences, never account keys")
        XCTAssertFalse(model.pickCalendar(key: "1"))
        XCTAssertTrue(model.calendarVisibilityStore.isVisible(calendar.id))
    }

    func testAnonymousCalendarHasNoVisibilityDigitPick() throws {
        let calendar = try XCTUnwrap(model.anonymousCalendar)
        XCTAssertTrue(model.calendarListGroups.isEmpty)
        model.focusCalendarList()
        XCTAssertFalse(model.pickCalendar(key: "1"))
        XCTAssertTrue(model.calendarVisibilityStore.isVisible(calendar.id))
    }

    func testAdditionalCalendarsRemainToggleableInLocalMode() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let event = try StoreSampleEvents.timedEvent(id: "additional-local", title: "Additional local event")
        let extra = LocalCalendarSentinel.synthesizeCalendar(id: event.calendarId)
        try environment.calendarRepository.upsert(calendars: [extra])
        try environment.localEventRepository.put(LocalEventRecord(id: event.id, event: event, isDemo: false))
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()

        XCTAssertNotNil(model.anonymousCalendar)
        XCTAssertEqual(model.calendarListGroups.flatMap(\.calendars).map(\.id), [extra.id])
        model.focusCalendarList()
        XCTAssertTrue(model.pickCalendar(key: "1"))
        XCTAssertFalse(model.calendarVisibilityStore.isVisible(extra.id))
        XCTAssertTrue(model.calendarVisibilityStore.isVisible(try XCTUnwrap(model.anonymousCalendar).id))
    }

    func testUndoRestoresCalendarVisibility() async throws {
        await model.authStore.bootstrap(forceDemoSignedIn: true)
        let calendar = try firstCalendar()
        model.toggleCalendarVisibility(calendar)
        XCTAssertFalse(model.calendarVisibilityStore.isVisible(calendar.id))

        await model.undoLastChangeAndWait()

        XCTAssertTrue(model.calendarVisibilityStore.isVisible(calendar.id))
        XCTAssertTrue(model.undoStore.canRedo)
    }
}
