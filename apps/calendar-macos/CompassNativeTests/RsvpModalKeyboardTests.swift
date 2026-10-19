import AppKit
import CompassData
import CompassKit
import XCTest

@MainActor
final class RsvpModalKeyboardTests: XCTestCase {
    func testEscapeDismissesRsvpScopeWithoutClosingTheEventForm() async throws {
        let (model, router) = try await makeRouter()
        let draft = model.draftStore.gridDraft

        XCTAssertTrue(router.handleKeyDown(try key("\u{1b}", code: 53)))

        XCTAssertNil(model.pendingRsvpChoice)
        XCTAssertTrue(model.isEventFormVisible)
        XCTAssertEqual(model.draftStore.gridDraft, draft)
    }

    func testRsvpDialogOwnsSaveAndDuplicateKeysAndModifierHints() async throws {
        let (model, router) = try await makeRouter()
        let draft = model.draftStore.gridDraft
        let pending = model.pendingRsvpChoice
        for (characters, code) in [("\r", UInt16(36)), ("d", UInt16(2))] {
            XCTAssertFalse(router.handleKeyDown(try key(characters, code: code, modifiers: .command)))
        }
        model.formFieldDigitHintsVisible = true
        router.handleFlagsChanged(try key("", code: 55, modifiers: .command))
        XCTAssertFalse(model.formFieldDigitHintsVisible)
        XCTAssertEqual(model.pendingRsvpChoice, pending)
        XCTAssertEqual(model.draftStore.gridDraft, draft)
    }

    private func makeRouter() async throws -> (NativeCalendarRootModel, NativeGridKeyboardRouter) {
        _ = NSApplication.shared
        let environment = try NativeCalendarEnvironment(appURL: URL(string: "https://compass.invalid")!,
            inMemoryDatabase: true, sessionStore: MemorySessionStore())
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: try DemoSeedFixture.load())
        await model.start()
        model.focusGridEvent(eventId: "demo-morning-standup")
        model.openKeyboardEditForFocusedEvent()
        XCTAssertTrue(model.isEventFormVisible)
        model.pendingRsvpChoice = PendingRsvpChoice(eventId: EventId(rawValue: "demo-morning-standup"), responseStatus: .accepted)
        let router = NativeGridKeyboardRouter(model: model, registry: try ShortcutRegistry())
        router.dispatcher.pushScope(.grid)
        return (model, router)
    }

    private func key(_ characters: String, code: UInt16, modifiers: NSEvent.ModifierFlags = []) throws -> NSEvent {
        try XCTUnwrap(NSEvent.keyEvent(with: .keyDown, location: .zero, modifierFlags: modifiers,
            timestamp: 0, windowNumber: 0, context: nil, characters: characters,
            charactersIgnoringModifiers: characters, isARepeat: false, keyCode: code))
    }
}
