import Foundation

/// Mirrors web `anon-explorer-engagement.util.ts` and
/// `selectLocalModeConnectPromptEligible` in `local-mode-connect.store.ts`.
public enum AnonymousExplorerEngagement {
    /// One genuine calendar write is enough to nudge signup.
    public static let writeEngagementCount = 1
    /// A few handled shortcuts without a write still counts as engaged.
    public static let shortcutEngagementCount = 5

    public static func isEngaged(writeCount: Int, shortcutCount: Int) -> Bool {
        writeCount >= writeEngagementCount || shortcutCount >= shortcutEngagementCount
    }

    /// Shortcut-only explorers get the sign-up nudge instead of the first-event card.
    public static func shouldDeferFirstEventPrompt(writeCount: Int, shortcutCount: Int) -> Bool {
        writeCount < writeEngagementCount && shortcutCount >= shortcutEngagementCount
    }

    public struct LocalModePromptInput: Sendable {
        public var authenticated: Bool
        public var hasUserEverAuthenticated: Bool
        public var writeCount: Int
        public var shortcutCount: Int
        public var isDismissed: Bool
        public var isAuthModalOpen: Bool
        public var isShowcaseActive: Bool
        public var isWelcomeBlocking: Bool
        public var signInAvailable: Bool
        public var firstEventPromptVisible: Bool
        public var firstEventCelebrating: Bool

        public init(
            authenticated: Bool,
            hasUserEverAuthenticated: Bool,
            writeCount: Int,
            shortcutCount: Int,
            isDismissed: Bool,
            isAuthModalOpen: Bool,
            isShowcaseActive: Bool,
            isWelcomeBlocking: Bool,
            signInAvailable: Bool,
            firstEventPromptVisible: Bool,
            firstEventCelebrating: Bool
        ) {
            self.authenticated = authenticated
            self.hasUserEverAuthenticated = hasUserEverAuthenticated
            self.writeCount = writeCount
            self.shortcutCount = shortcutCount
            self.isDismissed = isDismissed
            self.isAuthModalOpen = isAuthModalOpen
            self.isShowcaseActive = isShowcaseActive
            self.isWelcomeBlocking = isWelcomeBlocking
            self.signInAvailable = signInAvailable
            self.firstEventPromptVisible = firstEventPromptVisible
            self.firstEventCelebrating = firstEventCelebrating
        }
    }

    public static func localModePromptEligible(_ input: LocalModePromptInput) -> Bool {
        if input.authenticated || input.hasUserEverAuthenticated || input.isDismissed
            || !isEngaged(writeCount: input.writeCount, shortcutCount: input.shortcutCount)
            || input.isAuthModalOpen || input.isShowcaseActive || input.isWelcomeBlocking
            || !input.signInAvailable || input.firstEventCelebrating
        {
            return false
        }
        return !(input.firstEventPromptVisible && input.writeCount == 0)
    }
}
