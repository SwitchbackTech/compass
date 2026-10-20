import Foundation

public struct QuickTimeSlotHint: Hashable, Sendable, Identifiable {
    public var id: String { sequence }
    public var sequence: String
    public var frame: EventPosition

    public init(sequence: String, frame: EventPosition) {
        self.sequence = sequence
        self.frame = frame
    }
}
