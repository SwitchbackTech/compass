import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelWelcomeTests: XCTestCase {
    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: OnboardingStorageKeys.hasSeenWelcome)
        UserDefaults.standard.removeObject(forKey: OnboardingStorageKeys.welcomeExit)
        super.tearDown()
    }

    /// Regression: the gating keeps the modal up while the first-visit flag is
    /// set, so leaving welcome must clear it or Explore and Log in do nothing.
    func testWelcomeExitsClearFirstVisitFlag() throws {
        let exits: [(NativeCalendarRootModel) -> Void] = [
            { $0.welcomeExplore() },
            { $0.welcomeLogIn() },
            { $0.welcomeSignUp() },
        ]
        for exit in exits {
            let model = try makeModel()
            model.onboardingStore.setWelcomeFirstVisitOpen(true)
            exit(model)
            XCTAssertFalse(model.onboardingStore.isWelcomeFirstVisitOpen)
            XCTAssertTrue(model.onboardingStore.hasSeenWelcome)
            UserDefaults.standard.removeObject(forKey: OnboardingStorageKeys.hasSeenWelcome)
        }
    }

    func testWelcomePrimaryActionAdvancesThenExplores() throws {
        let model = try makeModel()
        model.onboardingStore.setWelcomeFirstVisitOpen(true)
        model.welcomePrimaryAction()
        model.welcomePrimaryAction()
        XCTAssertEqual(model.onboardingStore.welcomeStep, 3)
        XCTAssertTrue(model.onboardingStore.isWelcomeFirstVisitOpen)
        model.welcomePrimaryAction()
        XCTAssertFalse(model.onboardingStore.isWelcomeFirstVisitOpen)
        XCTAssertEqual(UserDefaults.standard.string(forKey: OnboardingStorageKeys.welcomeExit), "explore")
    }

    func testWelcomeBackStopsAtFirstScreen() throws {
        let model = try makeModel()
        model.welcomePrimaryAction()
        model.welcomeBack()
        model.welcomeBack()
        XCTAssertEqual(model.onboardingStore.welcomeStep, 1)
    }

    private func makeModel() throws -> NativeCalendarRootModel {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        return NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
    }
}
