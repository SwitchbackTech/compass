import XCTest

extension XCUIApplication {
    /// A Compass launch with `-COMPASS_UI_TEST`, which attaches the AppKit
    /// accessibility probes these tests read. Fixture startup stays independent
    /// of the live service. Production launches omit these arguments.
    static func compassUITest() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-COMPASS_UI_TEST", "-COMPASS_APP_URL", "https://compass.invalid"]
        return app
    }
}
