import CompassData
import CompassKit
import XCTest

@MainActor
final class EventFormTimeZoneTests: XCTestCase {
    func testNativeDateControlsUsePinnedCalendarTimeZone() async throws {
        let savedZone = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = savedZone }
        EffectiveTimeZone.identifier = "Pacific/Auckland"
        let environment = try NativeCalendarEnvironment(
            inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(
            environment: environment, demoPresentation: try DemoSeedFixture.load())
        await model.start()
        XCTAssertTrue(model.viewStore.setPinnedTimeZone("Pacific/Auckland"))
        model.createTimedDraft(activity: .createShortcut)
        model.openEventFormForCurrentDraft()
        XCTAssertNotNil(model.draftStore.gridDraft)
        XCTAssertEqual(EffectiveTimeZone.calendar.timeZone.identifier, "Pacific/Auckland")
    }
}
