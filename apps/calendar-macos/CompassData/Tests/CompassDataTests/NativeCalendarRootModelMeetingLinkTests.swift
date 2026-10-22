import AppKit
import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelMeetingLinkTests: XCTestCase {
    func testCopyMeetingLinkWritesPasteboardAndShowsToast() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()

        model.focusGridEvent(eventId: "demo-morning-standup")
        model.openKeyboardEditForFocusedEvent()

        XCTAssertEqual(model.meetingLinkURL(for: model.draftStore.gridDraft), "https://meet.google.com/abc-defg-hij")

        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        XCTAssertTrue(model.copyMeetingLinkFromForm())
        XCTAssertEqual(pasteboard.string(forType: .string), "https://meet.google.com/abc-defg-hij")
        XCTAssertEqual(model.statusToastStore.message, "Link copied")
    }

    func testEventFormPaletteListsCopyMeetingLink() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()

        model.focusGridEvent(eventId: "demo-morning-standup")
        model.openKeyboardEditForFocusedEvent()
        model.toggleCommandPalette()

        let ids = model.filteredPaletteSections().flatMap(\.items).map(\.id)
        XCTAssertTrue(ids.contains("event-form-edit-copy-meeting-link"))
    }
}
