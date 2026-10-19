import Foundation

@MainActor
@Observable
public final class EventJumpSelectionStore {
    public private(set) var activeDayKeys: [String] = []
    public private(set) var announcement: String?

    public var isActive: Bool {
        !activeDayKeys.isEmpty || announcement != nil
    }

    public func selectDay(key: String, announcement: String) {
        activeDayKeys = [key]
        self.announcement = announcement
    }

    public func clear() {
        activeDayKeys = []
        announcement = nil
    }
}
