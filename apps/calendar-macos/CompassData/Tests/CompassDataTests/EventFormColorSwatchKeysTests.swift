import CompassKit
import XCTest
@testable import CompassData

/// Web `EventColorPicker`: arrows move between swatches, Space / Enter or a
/// pick key chooses one.
@MainActor
final class EventFormColorSwatchKeysTests: XCTestCase {
    func testFocusingColorStartsOnTheSelectedSwatch() throws {
        let model = try model(color: .coral)
        model.focusEventFormField(.color)
        XCTAssertEqual(
            NativeCalendarRootModel.colorSwatchOptions[model.colorSwatchFocusIndex],
            .coral
        )
    }

    func testArrowsMoveFocusWithoutChangingTheColorAndStopAtTheEnds() throws {
        let model = try model(color: nil)
        model.focusEventFormField(.color)
        XCTAssertEqual(model.colorSwatchFocusIndex, 0)
        model.moveColorSwatchFocus(by: -1)
        XCTAssertEqual(model.colorSwatchFocusIndex, 0)
        model.moveColorSwatchFocus(by: 2)
        XCTAssertEqual(model.colorSwatchFocusIndex, 2)
        XCTAssertNil(model.draftStore.gridDraft?.color)
        model.moveColorSwatchFocus(by: 99)
        XCTAssertEqual(model.colorSwatchFocusIndex, NativeCalendarRootModel.colorSwatchOptions.count - 1)
    }

    func testPickingASwatchSetsTheDraftColor() throws {
        let model = try model(color: nil)
        model.focusEventFormField(.color)
        model.pickColorSwatch(at: 1)
        XCTAssertEqual(model.draftStore.gridDraft?.color, NativeCalendarRootModel.colorSwatchOptions[1])
        XCTAssertEqual(model.colorSwatchFocusIndex, 1)
        model.pickColorSwatch(at: 0)
        XCTAssertNil(model.draftStore.gridDraft?.color)
    }

    private func model(color: EventColorSlot?) throws -> NativeCalendarRootModel {
        let model = NativeCalendarRootModel(environment: try NativeCalendarEnvironment(inMemoryDatabase: true))
        let start = Date(timeIntervalSince1970: 1_780_000_000)
        model.draftStore.startGridDraft(activity: .keyboardPlace, draft: GridEventDraft(
            clientId: .init(rawValue: "color-keys"),
            schedule: .init(start: start, end: start.addingTimeInterval(3600), kind: .timed),
            calendarId: .init(rawValue: "cal-1"),
            color: color))
        return model
    }
}
