import Foundation

/// Mirrors web `resolvePosthogEnvironment` for the desktop PostHog super property.
public enum PosthogEnvironment {
    public static func resolve(hostname: String?) -> String {
        switch hostname {
        case "staging.compasscalendar.com":
            return "staging"
        case "compasscalendar.com", "www.compasscalendar.com":
            return "production"
        default:
            return "production"
        }
    }
}
