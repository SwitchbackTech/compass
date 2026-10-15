import Foundation

public enum TimeGridScrollRequest: Equatable, Sendable {
    case pageUp
    case pageDown
    case hourUp
    case hourDown
    /// Y in the timed grid (0 = midnight); the day header is pinned above it.
    case revealDocumentY(Double)
    /// Scroll to the now line when needed; pulse today + now when already there.
    case scrollToNowOrPulse
}
