import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class EventFormDuplicateUndoTests: XCTestCase {
    func testFormDuplicateCanBeUndoneAndRedoneWithoutChangingTheOriginal() async throws {
        let environment = try NativeCalendarEnvironment(appURL: URL(string: "https://compass.invalid")!,
            inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: try DemoSeedFixture.load())
        await model.start()
        model.focusGridEvent(eventId: "demo-morning-standup")
        model.openKeyboardEditForFocusedEvent()
        let original = try XCTUnwrap(model.event(for: "demo-morning-standup"))
        let before = Set(model.loadedEvents.map(\.id))

        await model.duplicateFocusedOrFormEvent()
        let added = Set(model.loadedEvents.map(\.id)).subtracting(before)
        XCTAssertEqual(added.count, 1)
        XCTAssertTrue(model.undoStore.canUndo)
        await model.undoLastChangeAndWait()
        XCTAssertEqual(Set(model.loadedEvents.map(\.id)), before)
        await model.redoLastChangeAndWait()
        XCTAssertEqual(Set(model.loadedEvents.map(\.id)).subtracting(before).count, 1)
        XCTAssertEqual(model.event(for: original.id), original)
    }
}
