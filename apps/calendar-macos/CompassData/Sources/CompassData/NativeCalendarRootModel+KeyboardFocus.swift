import CompassKit
import Foundation

/// Banners the `p` shortcut can focus, top of the window first.
public enum NativeNotice: String, Sendable, CaseIterable {
    case billingPastDue
    case demoEvents
    case updateReady
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
        monthPickerFocusDate = viewStore.anchorDate
        monthPickerMonth = viewStore.anchorDate
    }

    public func moveMonthPickerFocus(byDays days: Int) {
        guard let date = monthPickerFocusDate,
              let next = EffectiveTimeZone.calendar.date(byAdding: .day, value: days, to: date)
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
