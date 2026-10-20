import CompassKit
import XCTest
@testable import CompassData

@MainActor
final class NoticeEngagementTests: XCTestCase {
    private var savedDefaults: [String: Any] = [:]
    private let keys = [
        OnboardingStorageKeys.firstEventDone,
        OnboardingStorageKeys.anonymousCalendarWriteCount,
        OnboardingStorageKeys.anonymousShortcutEngagementCount,
        OnboardingStorageKeys.hasDismissedLocalModeConnectPrompt,
        OnboardingStorageKeys.hasDismissedMeetingPageNudge,
    ]

    override func setUp() async throws {
        for key in keys {
            savedDefaults[key] = UserDefaults.standard.object(forKey: key)
            UserDefaults.standard.removeObject(forKey: key)
        }
    }

    override func tearDown() async throws {
        for key in keys {
            if let value = savedDefaults[key] { UserDefaults.standard.set(value, forKey: key) }
            else { UserDefaults.standard.removeObject(forKey: key) }
        }
        savedDefaults = [:]
    }

    func testFirstRealCreateCelebratesAndCountsAnAnonymousWrite() async throws {
        let model = try await makeModel()
        model.handleShortcut(.createTimed)
        model.updateDraftFromForm(title: "Standup")
        await model.saveDraft()
        XCTAssertTrue(model.onboardingStore.isFirstEventCelebrating)
        XCTAssertEqual(model.onboardingStore.anonymousWriteCount, 1)
    }

    func testAnonymousShortcutsAreCounted() async throws {
        let model = try await makeModel()
        let before = model.onboardingStore.anonymousShortcutCount
        model.handleShortcut(.navToday)
        XCTAssertEqual(model.onboardingStore.anonymousShortcutCount, before + 1)
    }

    func testOKeyDismissesTheSampleEventsBanner() async throws {
        let model = try await makeModel(fixture: true)
        XCTAssertTrue(model.showsDemoEventsBanner)
        XCTAssertTrue(model.handleNoticeActionKey(KeyEvent(character: "o"), editSequenceArmed: false))
        XCTAssertFalse(model.showsDemoEventsBanner)
        XCTAssertFalse(model.handleNoticeActionKey(KeyEvent(character: "o"), editSequenceArmed: false))
    }

    func testNoticeLettersStandDownWhileAnEditSequenceIsArmed() async throws {
        let model = try await makeModel(fixture: true)
        XCTAssertFalse(model.handleNoticeActionKey(KeyEvent(character: "o"), editSequenceArmed: true))
        XCTAssertTrue(model.showsDemoEventsBanner)
    }

    func testMeetingNudgeNeedsASignedInHost() async throws {
        let model = try await makeModel()
        model.onboardingStore.dismissFirstEventPrompt()
        XCTAssertFalse(model.showsMeetingPageNudge)
        XCTAssertFalse(model.handleNoticeActionKey(KeyEvent(character: "m"), editSequenceArmed: false))
    }

    private func makeModel(fixture: Bool = false) async throws -> NativeCalendarRootModel {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(
            environment: environment,
            demoPresentation: fixture ? try DemoSeedFixture.load() : nil)
        await model.start()
        return model
    }
}
