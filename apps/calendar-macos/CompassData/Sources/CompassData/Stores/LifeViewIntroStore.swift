import CompassKit
import Foundation

public enum LifeViewIntroDismissReason: String, Sendable {
    case primary
    case escape
}

/// One-time Life view intro state; mirrors web `useLifeViewIntro`.
@MainActor
@Observable
public final class LifeViewIntroStore {
    public private(set) var isClosing = false
    private var dismissedThisVisit = false
    private var hasTrackedShown = false
    private var eligible = false

    private let defaults: UserDefaults
    private let analytics: ProductAnalyticsClient
    private let userAPI: UserAPI

    public init(
        userAPI: UserAPI,
        defaults: UserDefaults = .standard,
        analytics: ProductAnalyticsClient = NoOpProductAnalyticsClient()
    ) {
        self.userAPI = userAPI
        self.defaults = defaults
        self.analytics = analytics
    }

    public var isMounted: Bool {
        eligible || isClosing
    }

    public func refresh(
        onLifeView: Bool,
        authenticated: Bool,
        userMetadataLoaded: Bool,
        seenOnServer: Bool
    ) {
        if seenOnServer {
            LifeViewIntroGating.markSeenLocally(defaults: defaults)
        }
        let nextEligible = onLifeView && LifeViewIntroGating.isEligible(
            authenticated: authenticated,
            userMetadataLoaded: userMetadataLoaded,
            seenLocally: LifeViewIntroGating.hasSeenLocally(defaults: defaults),
            seenOnServer: seenOnServer,
            dismissedThisVisit: dismissedThisVisit)
        if nextEligible, !hasTrackedShown {
            hasTrackedShown = true
            analytics.track(ProductEvent.lifeViewIntroShown, properties: [:])
        }
        eligible = nextEligible
    }

    public func dismiss(reason: LifeViewIntroDismissReason, authenticated: Bool) {
        guard isMounted, !isClosing else { return }
        isClosing = true
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(200))
            self?.finalizeDismiss(reason: reason, authenticated: authenticated)
        }
    }

    private func finalizeDismiss(reason: LifeViewIntroDismissReason, authenticated: Bool) {
        LifeViewIntroGating.markSeenLocally(defaults: defaults)
        dismissedThisVisit = true
        eligible = false
        isClosing = false
        analytics.track(
            ProductEvent.lifeViewIntroDismissed,
            properties: ["cta": .string(reason.rawValue)])
        if authenticated {
            Task {
                let seenAt = ISO8601DateFormatter().string(from: Date())
                let patch = UserMetadata(onboarding: UserMetadataOnboarding(lifeViewIntroSeenAt: seenAt))
                _ = try? await userAPI.updateMetadata(patch)
            }
        }
    }
}
