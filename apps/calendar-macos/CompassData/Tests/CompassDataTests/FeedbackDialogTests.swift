import XCTest
@testable import CompassData

@MainActor
final class FeedbackDialogTests: XCTestCase {
    private struct SendFailure: Error {}

    func testPaletteRowOpensTheDialog() async throws {
        let model = try await makeModel()
        model.commandPaletteStore.open()
        model.runPaletteCommand(id: "share-feedback")
        XCTAssertTrue(model.isFeedbackDialogPresented)
        XCTAssertFalse(model.commandPaletteStore.isOpen)
    }

    func testSendTrimsClosesAndThanks() async throws {
        let model = try await makeModel()
        var sent: (String, String)?
        model.feedbackSender = { sent = ($0, $1) }
        model.viewStore.view = .day
        model.openFeedbackDialog()
        await model.submitFeedback("  love it \n")
        XCTAssertEqual(sent?.0, "love it")
        XCTAssertEqual(sent?.1, "day")
        XCTAssertFalse(model.isFeedbackDialogPresented)
        XCTAssertEqual(model.statusToastStore.message, "Feedback sent to the big boss, thanks!")
    }

    func testFailureKeepsTheDialogOpenWithAnErrorToast() async throws {
        let model = try await makeModel()
        model.feedbackSender = { _, _ in throw SendFailure() }
        model.openFeedbackDialog()
        await model.submitFeedback("hello")
        XCTAssertTrue(model.isFeedbackDialogPresented)
        XCTAssertFalse(model.isFeedbackSubmitting)
        XCTAssertEqual(model.statusToastStore.message, "Couldn't send your feedback. Please try again.")
    }

    func testBlankFeedbackIsNotSent() async throws {
        let model = try await makeModel()
        var calls = 0
        model.feedbackSender = { _, _ in calls += 1 }
        model.openFeedbackDialog()
        await model.submitFeedback("   \n ")
        XCTAssertEqual(calls, 0)
        XCTAssertTrue(model.isFeedbackDialogPresented)
    }

    private func makeModel() async throws -> NativeCalendarRootModel {
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: try DemoSeedFixture.load())
        await model.start()
        return model
    }
}
