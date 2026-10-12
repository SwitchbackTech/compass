import Foundation

public enum SystemCalendarConnectionStore {
    private static let connectedKey = "compass.systemCalendar.connected"

    public static var isConnected: Bool {
        UserDefaults.standard.bool(forKey: connectedKey)
    }

    public static func markConnected() {
        UserDefaults.standard.set(true, forKey: connectedKey)
    }

    public static func markDisconnected() {
        UserDefaults.standard.removeObject(forKey: connectedKey)
    }

    #if DEBUG
    public static func resetForTests() {
        markDisconnected()
    }
    #endif
}
