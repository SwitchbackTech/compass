import CompassKit
import XCTest

final class DesktopDebugCommandTests: XCTestCase {
    func testCreateWithTitleOnlyUsesDefaults() {
        XCTAssertEqual(
            DesktopDebugCommand.parse("compass://debug/create?title=Board%20Sync"),
            .create(title: "Board Sync", start: nil, minutes: 60))
    }

    func testCreateWithStartAndMinutes() {
        XCTAssertEqual(
            DesktopDebugCommand.parse("compass://debug/create?title=Standup&start=2026-10-15T09:30&minutes=30"),
            .create(title: "Standup", start: "2026-10-15T09:30", minutes: 30))
    }

    func testCreateRejectsMissingTitleBadStartAndBadMinutes() {
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/create"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/create?title=%20%20"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/create?title=A&start=2026-13-01T09:30"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/create?title=A&start=tomorrow"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/create?title=A&minutes=0"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/create?title=A&minutes=5000"))
    }

    func testDeleteNeedsAnId() {
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/delete?id=abc123"), .delete(eventId: "abc123"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/delete"))
    }

    func testBareCommands() {
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/undo"), .undo)
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/redo"), .redo)
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/today"), .today)
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/today/"), .today)
    }

    func testGoToValidatesTheDate() {
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/goto?date=2026-06-10"), .goTo(date: "2026-06-10"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/goto?date=2026-02-30"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/goto"))
    }

    func testViewSwitches() {
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/view/day"), .view(.day))
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/view/week"), .view(.week))
        XCTAssertEqual(DesktopDebugCommand.parse("compass://debug/view/life"), .view(.life))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/view/month"))
    }

    func testOtherLinksAreNotDebugCommands() {
        XCTAssertNil(DesktopDebugCommand.parse("compass://day/2026-06-10"))
        XCTAssertEqual(
            DesktopDebugCommand.parse("compass://debug/parity-export?name=week-grid"),
            .parityExport(surface: "week-grid"))
        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/parity-export?name=not-a-surface"))

        XCTAssertNil(DesktopDebugCommand.parse("compass://debug/unknown"))
        XCTAssertNil(DesktopDebugCommand.parse("https://debug/undo"))
    }
}
