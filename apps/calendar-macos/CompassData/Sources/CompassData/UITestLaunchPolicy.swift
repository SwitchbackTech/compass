import CompassKit
import Foundation

/// Launch arguments read by native UI for XCUITest only. Production launches omit these.
public enum UITestLaunchPolicy {
    /// Launch argument every CompassUITests launch passes. Without it the app
    /// attaches no XCUITest accessibility probes.
    public static let uiTestLaunchArgument = "-COMPASS_UI_TEST"

    /// Whether to attach the AppKit accessibility probes XCUITest reads. A probe
    /// takes first responder when the event form opens, so production builds
    /// must never attach one: it swallows typing meant for the SwiftUI field.
    public static var attachesAccessibilityProbes: Bool {
        attachesAccessibilityProbes(arguments: ProcessInfo.processInfo.arguments)
    }

    public static func attachesAccessibilityProbes(arguments: [String]) -> Bool {
        arguments.contains(uiTestLaunchArgument)
    }

    /// Fixture interaction tests must not prompt for or post real system notifications.
    public static var allowsSystemNotifications: Bool {
        allowsSystemNotifications(arguments: ProcessInfo.processInfo.arguments)
    }

    public static func allowsSystemNotifications(arguments: [String]) -> Bool {
        !arguments.contains(uiTestLaunchArgument)
    }

    /// When set, focuses this grid event once the demo fixture layout is ready (no pointer hint).
    public static var initialGridFocusEventId: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "-COMPASS_UI_TEST_INITIAL_GRID_FOCUS_EVENT"),
            index + 1 < args.count
        else { return nil }
        let value = args[index + 1]
        return value.isEmpty ? nil : value
    }

    /// When set, a grid tap that would show the scroll hint focuses this event id instead.
    public static var gridClickFocusEventId: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "-COMPASS_UI_TEST_GRID_CLICK_FOCUS_EVENT"),
            index + 1 < args.count
        else { return nil }
        let value = args[index + 1]
        return value.isEmpty ? nil : value
    }

    /// Opens the native edit form for the initially focused grid event once layout is ready.
    public static var openFocusedEventFormAfterInitialGridFocus: Bool {
        ProcessInfo.processInfo.arguments.contains("-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM")
    }

    /// Whether the keyboard router rebuilds the event form title from key events
    /// instead of letting them reach the SwiftUI field. XCUITest keystrokes often
    /// miss that field, so only the open-focused-form tests opt in. A normal launch
    /// must never mirror: key events are lowercased, and the mirror treats Cmd+A as
    /// clear and Cmd+V as replace.
    public static var mirrorsEventFormTitleTyping: Bool {
        mirrorsEventFormTitleTyping(arguments: ProcessInfo.processInfo.arguments)
    }

    public static func mirrorsEventFormTitleTyping(arguments: [String]) -> Bool {
        arguments.contains("-COMPASS_UI_TEST_OPEN_FOCUSED_EVENT_FORM")
    }

    /// Full week column count so demo fixture events stay in the focus layout during XCUITest.
    public static var pinnedWeekGridTrackWidth: CGFloat? {
        if ProcessInfo.processInfo.environment["PARITY_CAPTURE"] == "1"
            || ProcessInfo.processInfo.arguments.contains("-COMPASS_UI_TEST_PARITY_CAPTURE")
        {
            return CGFloat(ParityCaptureGeometry.contentTrackWidth)
        }
        if initialGridFocusEventId != nil
            || openFocusedEventFormAfterInitialGridFocus
            || ProcessInfo.processInfo.arguments.contains("-COMPASS_UI_TEST_PIN_WEEK_GRID_TRACK")
        {
            return 1030
        }
        return nil
    }

    /// Keeps the native quick-add panel key so Debug menu XCUITests can reach the field.
    public static var stickyQuickAddPanel: Bool {
        ProcessInfo.processInfo.arguments.contains("-COMPASS_UI_TEST_STICKY_QUICK_ADD_PANEL")
    }

    /// Confirms recurring save scope in-process (keyboard scope digits are flaky in CI).
    public static var autoConfirmRecurrenceScopeOnSave: Bool {
        ProcessInfo.processInfo.arguments.contains("-COMPASS_UI_TEST_AUTO_CONFIRM_RECURRENCE_SCOPE_SAVE")
    }

    /// Seeds the open event form title (XCUITest typing is flaky for recurring edits in CI).
    public static var presetEventFormTitle: String? {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "-COMPASS_UI_TEST_EVENT_FORM_TITLE"),
            index + 1 < args.count
        else { return nil }
        let value = args[index + 1]
        return value.isEmpty ? nil : value
    }

    /// Appends a recurring occurrence row to the demo seed for recurrence-scope XCUITest.
    public static var appendDemoOccurrenceForUITest: Bool {
        ProcessInfo.processInfo.arguments.contains("-COMPASS_UI_TEST_APPEND_DEMO_OCCURRENCE")
    }
}
