import CompassKit
import Foundation

public protocol AnalyticsIdentityCoordinator: Sendable {
    func applyPostHogConfig(_ config: AppConfigPosthog?) async
    func setPostHogEnvironment(hostname: String?) async
    func identify(userId: String) async
    func resetIdentity() async
    func trackLoginCompleted(method: String) async
    func trackSignupCompleted(method: String) async
}

public struct NoOpAnalyticsIdentityCoordinator: AnalyticsIdentityCoordinator {
    public init() {}

    public func applyPostHogConfig(_ config: AppConfigPosthog?) async {}

    public func setPostHogEnvironment(hostname: String?) async {}

    public func identify(userId: String) async {}

    public func resetIdentity() async {}

    public func trackLoginCompleted(method: String) async {}

    public func trackSignupCompleted(method: String) async {}
}
