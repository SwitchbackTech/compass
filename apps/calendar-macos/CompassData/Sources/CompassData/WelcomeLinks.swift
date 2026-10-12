import Foundation

/// Web `WelcomeLinks` footer on the last welcome screen, with its jump keys.
public enum WelcomeLinks {
    public struct Link: Sendable {
        public let label: String
        public let key: Character
        public let url: URL
    }

    public static let items: [Link] = [
        Link(label: "Pricing", key: "p", url: URL(string: "https://www.compasscalendar.com/pricing")!),
        Link(label: "Privacy", key: "9", url: URL(string: "https://www.compasscalendar.com/privacy")!),
        Link(label: "Terms", key: "0", url: URL(string: "https://www.compasscalendar.com/terms")!),
    ]
}
