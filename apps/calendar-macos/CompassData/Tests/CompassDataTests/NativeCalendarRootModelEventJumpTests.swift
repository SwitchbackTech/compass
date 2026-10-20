import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelEventJumpTests: XCTestCase {
    func testToggleEventJumpModeShowsQuickTimeSlots() async throws {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment)
        await model.start()
        EffectiveTimeZone.identifier = "UTC"
        model.goToDate(CompassDateParsing.calendarDateInEffectiveTimeZone("2026-05-18")!)
        XCTAssertFalse(model.eventJumpSelection.modeActive)
        model.toggleEventJumpMode()
        XCTAssertTrue(model.eventJumpSelection.modeActive)
        XCTAssertFalse(model.timeGridState.quickTimeSlotHints.isEmpty)
        model.toggleEventJumpMode()
        XCTAssertFalse(model.eventJumpSelection.modeActive)
        XCTAssertTrue(model.timeGridState.quickTimeSlotHints.isEmpty)
    }

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

    func testQuickTimeUsesJumpSelectedDay() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        model.viewStore.view = .week
        model.handleShiftDayJump(letter: "M")
        model.handleQuickTimeDigit("1")
        model.handleQuickTimeDigit("1")
        model.commitQuickTimeIfBuffered()
        let draft = try XCTUnwrap(model.draftStore.gridDraft)
        let start = try XCTUnwrap(draft.schedule.start)
        let calendar = EffectiveTimeZone.calendar
        XCTAssertEqual(calendar.component(.hour, from: start), 11)
        XCTAssertEqual(CompassDateParsing.formatCalendarDay(start), "2026-06-08")
    }
}
