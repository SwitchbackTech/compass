import CompassData
import CompassKit
import XCTest

@MainActor
final class SettingsNavigationTests: XCTestCase {
    private func makeModel() throws -> NativeCalendarRootModel {
        NativeCalendarRootModel(environment: try NativeCalendarEnvironment(
            inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil)))
    }

    func testNavigationRespectsVisibleSectionsAndTextInput() throws {
        let model = try makeModel()
        model.settingsStore.open()
        XCTAssertFalse(model.handleSettingsNavigation(KeyEvent(character: "2"), isTextInputFocused: false))
        XCTAssertFalse(model.handleSettingsNavigation(KeyEvent(character: "3"), isTextInputFocused: false))
        model.settingsStore.beginGuestMeetingSetup()
        XCTAssertTrue(model.handleSettingsNavigation(KeyEvent(character: "1"), isTextInputFocused: false))
        XCTAssertEqual(model.settingsStore.page, .accounts)
        XCTAssertFalse(model.handleSettingsNavigation(KeyEvent(character: "3"), isTextInputFocused: true))
        XCTAssertTrue(model.handleSettingsNavigation(KeyEvent(character: "3", modifiers: .command), isTextInputFocused: true))
        XCTAssertEqual(model.settingsStore.page, .booking)
        XCTAssertTrue(model.handleSettingsNavigation(KeyEvent(character: "1"), isTextInputFocused: false))
        XCTAssertEqual(model.settingsStore.page, .accounts)
    }

    func testTimezoneDialogAndClosedSettingsDoNotNavigate() throws {
        let model = try makeModel()
        XCTAssertFalse(model.handleSettingsNavigation(KeyEvent(character: "1"), isTextInputFocused: false))
        model.settingsStore.open(page: .billing)
        model.settingsStore.openTimezoneDialog(.pin)
        XCTAssertFalse(model.handleSettingsNavigation(KeyEvent(character: "1"), isTextInputFocused: false))
        XCTAssertEqual(model.settingsStore.page, .billing)
    }
}
