import CompassKit

extension NativeCalendarRootModel {
    public var settingsHasBilling: Bool {
        BillingPlanBadgeResolver.badge(access: billingStore.appAccess) != nil
    }

    public var settingsHasMeetings: Bool {
        isSignedIn || (settingsStore.guestMeetingSetupActive && settingsStore.isPresented)
    }

    /// Settings digits select sections without reaching calendar page jumps.
    public func handleSettingsNavigation(_ event: KeyEvent, isTextInputFocused: Bool) -> Bool {
        guard settingsStore.isPresented, settingsStore.timezoneDialogPurpose == nil,
              !event.isRepeat, event.modifiers.isEmpty || event.modifiers == [.command],
              !isTextInputFocused || event.modifiers == [.command],
              case .character(let digit) = event.key else { return false }
        switch digit {
        case "1": settingsStore.page = .accounts
        case "2" where settingsHasBilling || settingsStore.page == .billing:
            settingsStore.page = .billing
        case "3" where settingsHasMeetings || settingsStore.page == .booking:
            openBookingSettings()
        default: return false
        }
        return true
    }
}
