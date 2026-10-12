import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelKeyboardFocusTests: XCTestCase {
    private func makeModel() async throws -> NativeCalendarRootModel {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        return model
    }

    func testFocusSidebarOpensSidebarAndFocusesAnchorDay() async throws {
        let model = try await makeModel()
        model.isSidebarOpen = false

        model.handleShortcut(.focusSidebar)

        XCTAssertTrue(model.isSidebarOpen)
        XCTAssertEqual(model.monthPickerFocusDate, model.viewStore.anchorDate)
    }

    func testMonthPickerArrowsMoveFocusAndEnterGoesToDay() async throws {
        let model = try await makeModel()
        let calendar = EffectiveTimeZone.calendar
        let anchor = model.viewStore.anchorDate
        model.handleShortcut(.focusSidebar)

        model.moveMonthPickerFocus(byDays: 7)
        model.moveMonthPickerFocus(byDays: 1)
        model.commitMonthPickerFocus()

        let expected = try XCTUnwrap(calendar.date(byAdding: .day, value: 8, to: anchor))
        XCTAssertNil(model.monthPickerFocusDate)
        XCTAssertTrue(calendar.isDate(model.viewStore.anchorDate, inSameDayAs: expected))
    }

    func testFocusNoticeCyclesVisibleBannersAndEnterRunsTheButton() async throws {
        let model = try await makeModel()
        model.desktopUpdateReadyVersion = "2.0.0"
        XCTAssertEqual(model.visibleNotices, [.demoEvents, .updateReady])

        model.handleShortcut(.focusNotice)
        XCTAssertEqual(model.focusedNotice, .demoEvents)
        model.handleShortcut(.focusNotice)
        XCTAssertEqual(model.focusedNotice, .updateReady)
        model.handleShortcut(.focusNotice)
        XCTAssertEqual(model.focusedNotice, .demoEvents)

        model.activateFocusedNotice()

        XCTAssertNil(model.focusedNotice)
        XCTAssertFalse(model.showsDemoEventsBanner)
    }

    func testSubscribeDoesNothingOutsideATrial() async throws {
        let model = try await makeModel()

        model.handleShortcut(.otherSubscribe)

        XCTAssertFalse(model.billingStore.isUpgradeConfirmationPresented)
    }
}
