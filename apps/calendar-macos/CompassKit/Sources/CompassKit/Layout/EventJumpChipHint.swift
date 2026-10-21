import Foundation

public struct EventJumpChipHint: Hashable, Sendable, Identifiable {
    public var id: String { eventId }
    public var eventId: String
    public var label: String
    public var frame: EventPosition
    /// All-day frames are relative to the pinned all-day row, not the timed track.
    public var isAllDay: Bool

    public init(eventId: String, label: String, frame: EventPosition, isAllDay: Bool = false) {
        self.eventId = eventId
        self.label = label
        self.frame = frame
        self.isAllDay = isAllDay
    }
}
