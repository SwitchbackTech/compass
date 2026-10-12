import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelEventFormLocationTests: XCTestCase {
    func testUpdateDraftFromFormSetsLocation() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()

        model.focusGridEvent(eventId: "demo-morning-standup")
        model.openKeyboardEditForFocusedEvent()
        model.updateDraftFromForm(location: "1 Apple Park Way, Cupertino, CA")

        XCTAssertEqual(model.draftStore.gridDraft?.location, "1 Apple Park Way, Cupertino, CA")
        XCTAssertEqual(model.draftStore.gridDraft?.title, "Morning standup")
    }
}
