import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelEventJumpTests: XCTestCase {
    func testShiftDayJumpSelectsMondayColumn() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        model.viewStore.view = .week

        model.handleShiftDayJump(letter: "M")

        XCTAssertEqual(model.eventJumpSelection.activeDayKeys.count, 1)
        XCTAssertEqual(model.eventJumpSelection.announcement, "Monday selected")
        XCTAssertNotNil(model.eventJumpStatusText)
    }

    func testShiftDayJumpWeekendDisambiguation() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        model.viewStore.view = .week

        model.handleShiftDayJump(letter: "S")
        XCTAssertEqual(model.eventJumpSelection.dayJumpBuffer, "s")
        XCTAssertEqual(model.eventJumpStatusText, "Shift+U Sunday · Shift+A Saturday · Esc")

        model.handleShiftDayJump(letter: "A")
        XCTAssertEqual(model.eventJumpSelection.announcement, "Saturday selected")
    }
}
