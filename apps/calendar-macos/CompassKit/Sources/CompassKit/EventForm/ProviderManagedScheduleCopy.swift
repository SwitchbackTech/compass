import Foundation

public enum ProviderManagedScheduleCopy {
    public static func note(for calendar: CompassCalendar?) -> String {
        let subject: String
        switch calendar?.provider {
        case "google":
            subject = "Google"
        case "microsoft":
            subject = "Microsoft Outlook"
        case "apple":
            subject = "Apple"
        default:
            subject = "Your calendar"
        }
        return "\(subject) keeps this event's time updated. Your title, notes, and location edits stay in Compass."
    }
}
