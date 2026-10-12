import CompassKit
import Foundation

/// Welcome modal actions, shared by the view's buttons and the keyboard router
/// so clicks and keys behave the same, like the web `WelcomeModal`.
extension NativeCalendarRootModel {
    public var isWelcomeModalActive: Bool {
        activeOnboardingSurface == .welcomeModal
    }

    /// Enter: next screen on 1 and 2, Explore on the last one.
    public func welcomePrimaryAction() {
        if onboardingStore.welcomeStep < 3 {
            onboardingStore.advanceWelcomeStep()
        } else {
            welcomeExplore()
        }
    }

    /// Escape and Back step back one screen; on the first screen they do nothing.
    public func welcomeBack() {
        onboardingStore.retreatWelcomeStep()
    }

    public func welcomeExplore() {
        exitWelcome(reason: "explore")
        authStore.closeModal()
    }

    public func welcomeLogIn() {
        exitWelcome(reason: "log_in")
        authStore.openModal(.login)
    }

    public func welcomeSignUp() {
        exitWelcome(reason: "sign_up")
        authStore.openModal(.signUp)
    }

    public func welcomeSignIn(with provider: SignInProviderKind) {
        exitWelcome(reason: "sign_up_\(provider.rawValue)")
        authStore.signInWithProvider(provider)
    }

    /// Seen-ness lives in UserDefaults, which Observation cannot track, and the
    /// gating keeps the modal up while the first-visit flag is set. Clear the
    /// flag so the modal actually leaves.
    private func exitWelcome(reason: String) {
        onboardingStore.markWelcomeSeen(exit: reason)
        onboardingStore.setWelcomeFirstVisitOpen(false)
    }
}
