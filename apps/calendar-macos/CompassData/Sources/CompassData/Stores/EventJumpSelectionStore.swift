import Foundation

@MainActor
@Observable
public final class EventJumpSelectionStore {
    public private(set) var activeDayKeys: [String] = []
    public private(set) var announcement: String?
    /// Typed day-prefix buffer while resolving weekend Shift+S → U/A (web `matchDayJumpKeystroke`).
    public private(set) var dayJumpBuffer: String = ""

    public var isActive: Bool {
        !activeDayKeys.isEmpty || announcement != nil || !dayJumpBuffer.isEmpty
    }

    public func selectDay(key: String, announcement: String, buffer: String) {
        activeDayKeys = [key]
        self.announcement = announcement
        dayJumpBuffer = buffer
    }

    public func setWeekendDisambiguation(announcement: String) {
        activeDayKeys = []
        self.announcement = announcement
        dayJumpBuffer = "s"
    }

    public func clear() {
        activeDayKeys = []
        announcement = nil
        dayJumpBuffer = ""
    }
}
