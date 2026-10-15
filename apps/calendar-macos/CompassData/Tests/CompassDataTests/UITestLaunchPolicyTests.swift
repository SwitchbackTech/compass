import XCTest
@testable import CompassData

final class UITestLaunchPolicyTests: XCTestCase {
    func testProductionLaunchAttachesNoAccessibilityProbes() {
        XCTAssertFalse(UITestLaunchPolicy.attachesAccessibilityProbes(arguments: ["/Applications/Compass.app"]))
        XCTAssertFalse(
            UITestLaunchPolicy.attachesAccessibilityProbes(
                arguments: ["Compass", "-COMPASS_FIXTURE", "demo", "-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK"]))
    }

    func testUITestLaunchAttachesAccessibilityProbes() {
        XCTAssertTrue(
            UITestLaunchPolicy.attachesAccessibilityProbes(arguments: ["Compass", "-COMPASS_UI_TEST"]))
    }
}
