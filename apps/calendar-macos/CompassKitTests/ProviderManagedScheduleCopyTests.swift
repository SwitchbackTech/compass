import XCTest
@testable import CompassKit

final class ProviderManagedScheduleCopyTests: XCTestCase {
    func testScheduleNoteNamesEachProvider() {
        XCTAssertEqual(
            ProviderManagedScheduleCopy.note(for: calendar(provider: "google")),
            "Google keeps this event's time updated. Your title, notes, and location edits stay in Compass."
        )
        XCTAssertEqual(
            ProviderManagedScheduleCopy.note(for: calendar(provider: "microsoft")),
            "Microsoft Outlook keeps this event's time updated. Your title, notes, and location edits stay in Compass."
        )
        XCTAssertEqual(
            ProviderManagedScheduleCopy.note(for: calendar(provider: "apple")),
            "Apple keeps this event's time updated. Your title, notes, and location edits stay in Compass."
        )
    }

    func testScheduleNoteFallsBackWhenCalendarIsUnknown() {
        XCTAssertEqual(
            ProviderManagedScheduleCopy.note(for: nil),
            "Your calendar keeps this event's time updated. Your title, notes, and location edits stay in Compass."
        )
        XCTAssertEqual(
            ProviderManagedScheduleCopy.note(for: calendar(provider: "local")),
            "Your calendar keeps this event's time updated. Your title, notes, and location edits stay in Compass."
        )
    }

    private func calendar(provider: String) -> CompassCalendar {
        CompassCalendar(
            access: .owner,
            backgroundColor: "#ffffff",
            capabilities: .init(
                canInviteAttendees: true,
                canManage: true,
                canReadAvailability: true,
                canReadDetails: true,
                canWatchEvents: true,
                canWrite: true,
                conferenceKinds: []
            ),
            description: "",
            foregroundColor: "#000000",
            id: "cal-1",
            isActive: true,
            isPrimary: false,
            isVisible: true,
            name: "Work",
            provider: provider,
            timeZone: "UTC"
        )
    }
}
