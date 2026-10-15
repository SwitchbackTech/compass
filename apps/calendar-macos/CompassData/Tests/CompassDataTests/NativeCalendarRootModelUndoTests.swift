import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class NativeCalendarRootModelUndoTests: XCTestCase {
    func testUndoCreateRemovesKeyboardPlacedEvent() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        model.updateContentTrackWidth(400)

        XCTAssertTrue(
            model.nudgeDraftOrPlace(key: "ArrowDown", shiftKey: true, altKey: false))
        await model.saveDraft()
        XCTAssertTrue(model.undoStore.canUndo)

        let widths = model.timeGridState.resolvedColumnWidths()
        let untitledCards = {
            model.timeGridState.snapshot(colWidths: widths).cards.filter { $0.label == "Untitled event" }
        }
        XCTAssertEqual(untitledCards().count, 1)

        model.undoLastChange()
        for _ in 0 ..< 40 {
            try await Task.sleep(for: .milliseconds(50))
            if untitledCards().isEmpty { break }
        }
        XCTAssertTrue(untitledCards().isEmpty)
    }

    /// Regression: redo re-created the event under a new id but history kept
    /// the old one, so the redone event could not be undone.
    func testRedoneCreateCanBeUndoneAgain() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        model.updateContentTrackWidth(400)

        let seededIds = Set(model.loadedEvents.map(\.id))
        let newIds = { Set(model.loadedEvents.map(\.id)).subtracting(seededIds) }
        XCTAssertTrue(
            model.nudgeDraftOrPlace(key: "ArrowDown", shiftKey: true, altKey: false))
        model.saveKeyboardPlacedDraftNow()
        let createdIds = newIds()
        XCTAssertEqual(createdIds.count, 1)

        await model.undoLastChangeAndWait()
        XCTAssertTrue(newIds().isEmpty)

        model.redoLastChange()
        for _ in 0 ..< 40 where newIds().isEmpty {
            try await Task.sleep(for: .milliseconds(50))
        }
        let redoneIds = newIds()
        XCTAssertEqual(redoneIds.count, 1)
        XCTAssertTrue(model.undoStore.canUndo)
        XCTAssertFalse(model.undoStore.canRedo)

        await model.undoLastChangeAndWait()
        XCTAssertTrue(newIds().isEmpty)
        XCTAssertTrue(model.undoStore.canRedo)
    }

    func testSyncKeyboardPlaceSaveAndUndo() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        model.updateContentTrackWidth(400)

        XCTAssertTrue(
            model.nudgeDraftOrPlace(key: "ArrowDown", shiftKey: true, altKey: false))
        model.saveKeyboardPlacedDraftNow()
        XCTAssertTrue(model.undoStore.canUndo)

        let widths = model.timeGridState.resolvedColumnWidths()
        let untitledCards = {
            model.timeGridState.snapshot(colWidths: widths).cards.filter { $0.label == "Untitled event" }
        }
        XCTAssertEqual(untitledCards().count, 1)

        model.undoKeyboardPlacedCreateNow()
        XCTAssertTrue(untitledCards().isEmpty)
        XCTAssertNil(model.gridFocusAccessibilityLabel)
    }
}
