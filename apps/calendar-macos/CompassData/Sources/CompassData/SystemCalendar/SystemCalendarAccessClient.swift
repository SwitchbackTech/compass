import CompassKit
import EventKit
import Foundation

public protocol SystemCalendarAccessClient: Sendable {
    func authorizationStatus() -> SystemCalendarAccessResult
    func requestAccess() async -> SystemCalendarAccessResult
}

public struct LiveSystemCalendarAccessClient: SystemCalendarAccessClient, @unchecked Sendable {
    private let store: EKEventStore

    public init(store: EKEventStore = EKEventStore()) {
        self.store = store
    }

    public func authorizationStatus() -> SystemCalendarAccessResult {
        mapStatus(EKEventStore.authorizationStatus(for: .event))
    }

    public func requestAccess() async -> SystemCalendarAccessResult {
        if #available(macOS 14.0, *) {
            do {
                let granted = try await store.requestFullAccessToEvents()
                return granted ? .granted : .denied
            } catch {
                return .denied
            }
        }
        return .restricted
    }

    private func mapStatus(_ status: EKAuthorizationStatus) -> SystemCalendarAccessResult {
        switch status {
        case .fullAccess, .authorized:
            return .granted
        case .denied:
            return .denied
        case .restricted:
            return .restricted
        case .notDetermined, .writeOnly:
            return .denied
        @unknown default:
            return .denied
        }
    }
}

public final class MockSystemCalendarAccessClient: SystemCalendarAccessClient, @unchecked Sendable {
    public var status: SystemCalendarAccessResult
    public var requestResult: SystemCalendarAccessResult
    public private(set) var requestCount = 0

    public init(
        status: SystemCalendarAccessResult = .denied,
        requestResult: SystemCalendarAccessResult = .granted
    ) {
        self.status = status
        self.requestResult = requestResult
    }

    public func authorizationStatus() -> SystemCalendarAccessResult {
        status
    }

    public func requestAccess() async -> SystemCalendarAccessResult {
        requestCount += 1
        status = requestResult
        return requestResult
    }
}
