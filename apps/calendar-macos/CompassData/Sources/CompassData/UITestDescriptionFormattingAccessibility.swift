import Foundation

/// Cross-process notifications for mirroring description formatting controls in
/// XCUITest. AppKit toolbar buttons inside `NSViewRepresentable` are not exposed
/// in CI; the Compass app publishes hittable mirrors the editor keeps in sync.
public enum UITestDescriptionFormattingAccessibility {
    public static let syncNotification = Notification.Name("compassUITestDescriptionFormattingSync")
    public static let actionNotification = Notification.Name("compassUITestDescriptionFormattingAction")

    public enum Action: String, Sendable {
        case bold
        case italic
        case numberedList
        case bulletList
    }

    public enum Key {
        public static let visible = "visible"
        public static let action = "action"
        public static let boldOn = "boldOn"
        public static let italicOn = "italicOn"
        public static let numberedListOn = "numberedListOn"
        public static let bulletListOn = "bulletListOn"
    }
}

