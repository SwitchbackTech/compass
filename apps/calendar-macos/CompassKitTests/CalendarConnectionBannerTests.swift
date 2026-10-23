import CompassKit
import XCTest

final class CalendarConnectionBannerTests: XCTestCase {
    private func connection(
        _ state: UserMetadataConnectionsConnectionStateEnum,
        id: String = "c1",
        email: String? = "a@example.com",
        lastHealthyAt: String? = "2026-10-01T00:00:00Z",
        syncState: String = "healthy",
        reason: String? = nil
    ) -> UserMetadataConnections {
        UserMetadataConnections(
            accountEmail: email, canSuggestContacts: false, connectionState: state, id: id,
            lastHealthyAt: lastHealthyAt, lastSyncedAt: nil, provider: .google,
            state: syncState, stateReason: reason)
    }

    func testHealthyAccountsShowNothing() {
        XCTAssertNil(CalendarConnectionBanner.pick([connection(.hEALTHY)]))
    }

    func testReconnectOutranksADelayedAccountAndNamesTheEmail() throws {
        let banner = try XCTUnwrap(CalendarConnectionBanner.pick([
            connection(.aTTENTION, id: "late"),
            connection(.rECONNECT_REQUIRED, id: "expired", email: "b@example.com"),
        ]))
        XCTAssertEqual(banner.kind, .reconnect)
        XCTAssertEqual(banner.message, "b@example.com needs reconnecting.")
        XCTAssertEqual(banner.actionLabel, "Reconnect")
    }

    func testAttentionBeforeAnyHealthySyncIsAFailedImport() throws {
        let banner = try XCTUnwrap(CalendarConnectionBanner.pick([connection(.aTTENTION, lastHealthyAt: nil)]))
        XCTAssertEqual(banner.kind, .importFailed)
        XCTAssertEqual(banner.actionLabel, "Retry")
    }

    func testDelayedIsAWarningNotAnError() throws {
        let banner = try XCTUnwrap(CalendarConnectionBanner.pick([connection(.hEALTHY, syncState: "delayed")]))
        XCTAssertEqual(banner.kind, .delayed)
        XCTAssertFalse(banner.isError)
    }

    func testAdminConsentOffersHelp() throws {
        let banner = try XCTUnwrap(CalendarConnectionBanner.pick([connection(.aTTENTION, reason: "consentRequired")]))
        XCTAssertEqual(banner.kind, .consentRequired)
        XCTAssertEqual(banner.actionLabel, "Learn more")
    }
}

final class TimezoneMismatchTests: XCTestCase {
    func testShowsOnlyForAPinnedZoneThatDiffersAndIsNotSnoozed() {
        XCTAssertFalse(TimezoneMismatch.shouldShow(pinned: nil, device: "America/Denver", snoozedFor: nil))
        XCTAssertFalse(TimezoneMismatch.shouldShow(pinned: "America/Denver", device: "America/Denver", snoozedFor: nil))
        XCTAssertTrue(TimezoneMismatch.shouldShow(pinned: "Europe/Paris", device: "America/Denver", snoozedFor: nil))
        XCTAssertFalse(TimezoneMismatch.shouldShow(pinned: "Europe/Paris", device: "America/Denver", snoozedFor: "America/Denver"))
        XCTAssertFalse(TimezoneMismatch.shouldShow(pinned: "America/Denver", device: "UTC", snoozedFor: nil))
        XCTAssertFalse(TimezoneMismatch.shouldShow(pinned: "America/Denver", device: "UTC", snoozedFor: nil))
    }

    func testCopyNamesBothCities() {
        let copy = TimezoneMismatch.copy(device: "America/Denver", calendar: "Europe/Paris")
        XCTAssertTrue(copy.message.hasPrefix("Your device is in Denver time"))
        XCTAssertTrue(copy.message.contains("showing Paris time"))
        XCTAssertTrue(copy.switchLabel.hasPrefix("Switch to "))
    }
}
