import Foundation

/// Desktop wording; web counterpart is `apps/calendar-web/src/auth/providers/provider-copy.util.ts`.
public enum AccountChoiceCopy {
    public static let localDeviceOnlyLabel = "On this device only"
    public static let localDeviceOnlySubtitle =
        "Events stay on this Mac until you connect an account."
    public static let connectCalendarAccountLabel = "Connect a calendar account"
    public static let connectCalendarAccountHelper =
        "Pick a provider below. Or keep using this device only from the calendar list."

    /// Matches web `welcomeTrialCardTermsLine` (same facts as billing gate copy).
    public static func welcomeTrialCardTermsLine(trialLengthDays: Int = 7) -> String {
        "\(trialLengthDays)-day free trial. Card required, no charge until it ends."
    }
}
