import CompassData
import CompassKit
import XCTest

@MainActor
final class NativeCalendarRootModelParityPresentationTests: XCTestCase {
    private var priorParityEnv: String?

    override func setUp() {
        super.setUp()
        priorParityEnv = ProcessInfo.processInfo.environment["PARITY_CAPTURE"]
        setenv("PARITY_CAPTURE", "1", 1)
    }

    override func tearDown() {
        if let priorParityEnv {
            setenv("PARITY_CAPTURE", priorParityEnv, 1)
        } else {
            unsetenv("PARITY_CAPTURE")
        }
        super.tearDown()
    }

    func testParityCaptureUsesDemoSundayWeekAndFiveColumns() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()

        XCTAssertEqual(
            CompassDateParsing.formatCalendarDay(model.viewStore.anchorDate),
            "2026-06-07"
        )
        XCTAssertEqual(model.viewStore.visibleDayCount, ParityCaptureGeometry.visibleDayCount)
        XCTAssertEqual(
            Double(model.contentTrackWidth),
            ParityCaptureGeometry.contentTrackWidth,
            accuracy: 0.5
        )
        XCTAssertEqual(
            model.timeGridState.scenario.visibleDateKeys.first,
            "2026-06-07"
        )
        XCTAssertEqual(model.timeGridState.scenario.visibleDateKeys.count, 5)
    }

    func testGoToTodayDoesNotShiftAnchorWhenDemoDayAlreadyVisible() async throws {
        let fixture = try DemoSeedFixture.load()
        let environment = try NativeCalendarEnvironment(inMemoryDatabase: true)
        let model = NativeCalendarRootModel(environment: environment, demoPresentation: fixture)
        await model.start()
        model.applyParityCapturePresentationIfNeeded()
        let anchorBefore = model.viewStore.anchorDate

        model.handleShortcut(.navToday)

        XCTAssertEqual(model.viewStore.anchorDate, anchorBefore)
    }
}
