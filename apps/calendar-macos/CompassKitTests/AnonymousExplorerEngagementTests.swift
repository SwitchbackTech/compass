import CompassKit
import XCTest

final class AnonymousExplorerEngagementTests: XCTestCase {
    private func input(
        writeCount: Int = 1,
        shortcutCount: Int = 0,
        firstEventPromptVisible: Bool = false
    ) -> AnonymousExplorerEngagement.LocalModePromptInput {
        .init(
            authenticated: false,
            hasUserEverAuthenticated: false,
            writeCount: writeCount,
            shortcutCount: shortcutCount,
            isDismissed: false,
            isAuthModalOpen: false,
            isShowcaseActive: false,
            isWelcomeBlocking: false,
            signInAvailable: true,
            firstEventPromptVisible: firstEventPromptVisible,
            firstEventCelebrating: false)
    }

    func testOneWriteOrFiveShortcutsCountsAsEngaged() {
        XCTAssertFalse(AnonymousExplorerEngagement.isEngaged(writeCount: 0, shortcutCount: 4))
        XCTAssertTrue(AnonymousExplorerEngagement.isEngaged(writeCount: 1, shortcutCount: 0))
        XCTAssertTrue(AnonymousExplorerEngagement.isEngaged(writeCount: 0, shortcutCount: 5))
    }

    func testShortcutOnlyExplorersDeferTheFirstEventCard() {
        XCTAssertTrue(AnonymousExplorerEngagement.shouldDeferFirstEventPrompt(writeCount: 0, shortcutCount: 5))
        XCTAssertFalse(AnonymousExplorerEngagement.shouldDeferFirstEventPrompt(writeCount: 1, shortcutCount: 5))
    }

    func testPromptWaitsForEngagementAndYieldsToFirstEventCardBeforeAnyWrite() {
        XCTAssertTrue(AnonymousExplorerEngagement.localModePromptEligible(input()))
        XCTAssertFalse(AnonymousExplorerEngagement.localModePromptEligible(input(writeCount: 0)))
        XCTAssertFalse(AnonymousExplorerEngagement.localModePromptEligible(
            input(writeCount: 0, shortcutCount: 5, firstEventPromptVisible: true)))
        var signedIn = input()
        signedIn.hasUserEverAuthenticated = true
        XCTAssertFalse(AnonymousExplorerEngagement.localModePromptEligible(signedIn))
    }
}
