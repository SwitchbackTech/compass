import CompassKit
import Foundation

/// Banners the `p` shortcut can focus, top of the window first.
public enum NativeNotice: String, Sendable, CaseIterable {
    case billingPastDue
    case demoEvents
    case updateReady
    case meetingPageNudge
    case localModeConnectPrompt
}

/// Keyboard focus for the sidebar month picker (`i`) and banners (`p`).
/// The keyboard router sees every key before SwiftUI does, so focus lives
/// here like grid focus does, and the views only draw the ring.
extension NativeCalendarRootModel {
    // MARK: Month picker

    /// Web `useFocusSidebarShortcut`: open the sidebar and focus the
    /// picker's selected day so arrow keys move through dates.
    public func focusSidebar() {
        focusedNotice = nil
        isSidebarOpen = true
        monthPickerFocusDate = pickerCursor(in: monthPickerMonth, from: viewStore.anchorDate)
    }

    private func pickerCursor(in month: Date, from cursor: Date) -> Date {
        let calendar = EffectiveTimeZone.calendar
        return MonthPickerCursor.jump(
            from: cursor, to: month, isWeek: viewStore.visibleDayCount > 1,
            weekStart: calendar.component(.weekday, from: viewStore.anchorDate), calendar: calendar)
    }

    public func browseMonth(_ month: Date) {
        monthPickerMonth = month
        if let cursor = monthPickerFocusDate {
            monthPickerFocusDate = pickerCursor(in: month, from: cursor)
        }
    }

    public func moveMonthPickerFocus(byDays days: Int) {
        let step = viewStore.visibleDayCount > 1 ? (days < 0 ? -7 : 7) : days
        guard let date = monthPickerFocusDate,
              let next = EffectiveTimeZone.calendar.date(byAdding: .day, value: step, to: date)
        else { return }
        monthPickerFocusDate = next
        monthPickerMonth = next
    }

    public func commitMonthPickerFocus() {
        guard let date = monthPickerFocusDate else { return }
        monthPickerFocusDate = nil
        goToDate(date)
    }

    public func clearMonthPickerFocus() {
        monthPickerFocusDate = nil
    }

    // MARK: Notices

    public var visibleNotices: [NativeNotice] {
        var notices: [NativeNotice] = []
        if case let .server(server) = billingStore.appAccess, server.status == .pastDue {
            notices.append(.billingPastDue)
        }
        if showsDemoEventsBanner { notices.append(.demoEvents) }
        if desktopUpdateReadyVersion != nil { notices.append(.updateReady) }
        if showsMeetingPageNudge { notices.append(.meetingPageNudge) }
        if showsLocalModeConnectPrompt { notices.append(.localModeConnectPrompt) }
        return notices
    }

    /// Web `useFocusNoticeShortcut`: focus a notice, and cycle on repeat presses.
    public func focusNextNotice() {
        let notices = visibleNotices
        guard !notices.isEmpty else {
            focusedNotice = nil
            return
        }
        monthPickerFocusDate = nil
        if let current = focusedNotice, let index = notices.firstIndex(of: current) {
            focusedNotice = notices[(index + 1) % notices.count]
        } else {
            focusedNotice = notices[0]
        }
    }

    /// Enter on a focused notice runs its button.
    public func activateFocusedNotice() {
        guard let notice = focusedNotice else { return }
        focusedNotice = nil
        switch notice {
        case .billingPastDue:
            billingStore.openCheckoutFromPastDueBanner()
        case .demoEvents:
            dismissDemoEventsBanner()
        case .updateReady:
            onDesktopRestartToUpdate?()
        case .meetingPageNudge:
            openBookingSettings()
        case .localModeConnectPrompt:
            startTrialFromLocalModePrompt()
        }
    }

    public func clearNoticeFocus() {
        focusedNotice = nil
    }

    // MARK: Billing

    /// Web `other-subscribe` (`b`): only while a trial runs.
    func openUpgradeConfirmation() {
        guard billingStore.status?.subscriptionStatus == .trialing else { return }
        billingStore.isUpgradeConfirmationPresented = true
    }
}
