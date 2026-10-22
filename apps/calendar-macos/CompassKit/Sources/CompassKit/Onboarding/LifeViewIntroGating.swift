import Foundation

/// Eligibility for the one-time Life view intro; mirrors web `selectLifeViewIntroEligible`.
public enum LifeViewIntroGating {
    public static func isEligible(
        authenticated: Bool,
        userMetadataLoaded: Bool,
        seenLocally: Bool,
        seenOnServer: Bool,
        dismissedThisVisit: Bool
    ) -> Bool {
        if dismissedThisVisit || seenLocally || seenOnServer { return false }
        if authenticated, !userMetadataLoaded { return false }
        return true
    }

    public static func hasSeenLocally(defaults: UserDefaults = .standard) -> Bool {
        defaults.string(forKey: OnboardingStorageKeys.hasSeenLifeViewIntro) == "true"
    }

    public static func markSeenLocally(defaults: UserDefaults = .standard) {
        defaults.set("true", forKey: OnboardingStorageKeys.hasSeenLifeViewIntro)
    }

    public static func readSeenFromMetadata(_ metadata: UserMetadata?) -> Bool {
        metadata?.onboarding?.lifeViewIntroSeenAt != nil
    }
}
