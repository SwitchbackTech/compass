import XCTest

extension XCUIApplication {
    /// A Compass launch with `-COMPASS_UI_TEST`, which attaches the AppKit
    /// accessibility probes these tests read. Production launches omit it.
    static func compassUITest() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-COMPASS_UI_TEST"]
        return app
    }
}
