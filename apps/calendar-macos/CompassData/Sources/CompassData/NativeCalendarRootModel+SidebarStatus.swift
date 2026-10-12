import CompassKit
import Foundation

/// Web `SidebarStatusBar` and `SidebarRefreshButton`.
extension NativeCalendarRootModel {
    /// Web `DEGRADED_AFTER_MS`: a short reconnect stays quiet.
    static let streamDegradedAfter: TimeInterval = 15
    /// Web `REFRESH_AFTER_DEGRADED_MS`, counted from when it became degraded.
    static let refreshAfterDegraded: TimeInterval = 30

    public func sidebarSyncStatus(now: Date) -> SidebarSyncStatus? {
        SidebarSyncStatus.resolve(
            connections: syncConnectionsStore.connections,
            isSaving: eventsStore.inFlightMutations > 0,
            isStreamDegraded: streamTroubleDuration(now: now) >= Self.streamDegradedAfter,
            now: now)
    }

    /// Refresh shows once the stream has been degraded for a while.
    public func isSidebarRefreshDue(now: Date) -> Bool {
        streamTroubleDuration(now: now) >= Self.streamDegradedAfter + Self.refreshAfterDegraded
    }

    /// Refresh restarts the stream and reloads, like returning to the app.
    public func refreshFromSidebar() {
        streamTroubleSince = nil
        Task { await handleResume() }
    }

    private func streamTroubleDuration(now: Date) -> TimeInterval {
        streamTroubleSince.map { now.timeIntervalSince($0) } ?? 0
    }
}
