import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class NativeCalendarRootModelDefaultCalendarTests: XCTestCase {
    func testNewDraftHonorsPreferredCalendarEvenWhenHiddenFromGrid() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let event = try StoreSampleEvents.timedEvent(id: "secondary-local", title: "Local")
        let calendar = LocalCalendarSentinel.synthesizeCalendar(id: event.calendarId)
        try environment.calendarRepository.upsert(calendars: [calendar])
        try environment.localEventRepository.put(.init(id: event.id, event: event, isDemo: false))
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        let oldDefault = model.settingsStore.defaultCalendarId
        let wasVisible = model.calendarVisibilityStore.isVisible(calendar.id)
        defer {
            model.settingsStore.setDefaultCalendarId(oldDefault)
            model.calendarVisibilityStore.setVisible(calendar.id, wasVisible)
        }
        model.settingsStore.setDefaultCalendarId(calendar.id)
        model.calendarVisibilityStore.setVisible(calendar.id, false)
        XCTAssertTrue(model.writableEventCalendars.contains { $0.id == calendar.id })
        XCTAssertTrue(model.nudgeDraftOrPlace(key: "ArrowDown", shiftKey: true, altKey: false))
        XCTAssertEqual(model.draftStore.gridDraft?.calendarId?.rawValue, calendar.id)
    }
}
