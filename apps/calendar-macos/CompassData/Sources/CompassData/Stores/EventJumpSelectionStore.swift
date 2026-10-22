import Foundation

@MainActor
@Observable
public final class EventJumpSelectionStore {
    /// Web `event-jump.store` `isActive`: bare `f` toggles jump mode for quick-time slots.
    public private(set) var modeActive: Bool = false
    public private(set) var activeDayKeys: [String] = []
    public private(set) var announcement: String?
    /// Typed day-prefix buffer while resolving weekend Shift+S → U/A (web `matchDayJumpKeystroke`).
    public private(set) var dayJumpBuffer: String = ""

    public var isActive: Bool {
        modeActive || !activeDayKeys.isEmpty || announcement != nil || !dayJumpBuffer.isEmpty
    }

    public func selectDay(key: String, announcement: String, buffer: String) {
        activeDayKeys = [key]
        self.announcement = announcement
        dayJumpBuffer = buffer
    }

    /// Day prefix plus typed digits ("w", "w1") while picking an event.
    public func setDayJumpBuffer(_ buffer: String) {
        dayJumpBuffer = buffer
    }

    public func setWeekendDisambiguation(announcement: String) {
        activeDayKeys = []
        self.announcement = announcement
        dayJumpBuffer = "s"
    }

    public func setModeActive(_ active: Bool) {
        modeActive = active
        if !active {
            activeDayKeys = []
            announcement = nil
            dayJumpBuffer = ""
        }
    }

    public func clear() {
        setModeActive(false)
    }
}
