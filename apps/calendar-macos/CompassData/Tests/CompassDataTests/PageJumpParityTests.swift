import XCTest
@testable import CompassData

@MainActor
final class PageJumpParityTests: XCTestCase {
    func testWeekViewTargetsFollowWebOrder() async throws {
        let model = try await makeModel()
        model.viewStore.view = .week
        model.rebuildPresentation()
        XCTAssertEqual(
            model.focusStore.pageJumpTargets.map(\.id),
            ["view-select", "month-picker", "up-next", "calendars"])
    }

    func testDayViewPutsTheViewDropdownFirst() async throws {
        let model = try await makeModel()
        model.viewStore.view = .day
        model.rebuildPresentation()
        XCTAssertEqual(model.focusStore.pageJumpTargets.first?.id, "view-select")
        XCTAssertEqual(model.focusStore.pageJumpTargets.last?.id, "calendars")
    }

    func testModOneOpensTheViewDropdown() async throws {
        let model = try await makeModel()
        model.viewStore.view = .week
        model.rebuildPresentation()
        XCTAssertFalse(model.isViewSwitcherOpen)
        model.focusPageJump(digit: "1")
        XCTAssertTrue(model.isViewSwitcherOpen)
    }

    func testModTwoStillTargetsTheMonthPicker() async throws {
        let model = try await makeModel()
        model.viewStore.view = .week
        model.rebuildPresentation()
        model.monthPickerMonth = Date.distantPast
        model.focusPageJump(digit: "2")
        XCTAssertEqual(model.monthPickerMonth, model.viewStore.anchorDate)
        XCTAssertFalse(model.isViewSwitcherOpen)
    }

    private func makeModel() async throws -> NativeCalendarRootModel {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: try DemoSeedFixture.load())
        await model.start()
        return model
    }
}
