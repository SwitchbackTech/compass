import Foundation

/// PNG names for desktop ↔ web parity (keep in sync with CI scripts and e2e).
public enum ParityCaptureSurface: String, CaseIterable, Sendable {
    case weekGrid = "week-grid"
    case weekGridAllday = "week-grid-allday"
    case demoEventsBanner = "demo-events-banner"
    case modHoldOverlay = "mod-hold-overlay"
    case upNextBanner = "up-next-banner"
    case miniCalendar = "mini-calendar"
    case eventForm = "event-form"
    case eventFormDatePicker = "event-form-date-picker"
    case eventFormTimePicker = "event-form-time-picker"
    case eventFormMeetingLink = "event-form-meeting-link"
    case commandPalette = "command-palette"
    case settings = "settings"
    case onboardingWelcome = "onboarding-welcome"

    public static func isValid(_ name: String) -> Bool {
        ParityCaptureSurface(rawValue: name) != nil
    }
}
