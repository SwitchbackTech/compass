import Foundation

/// Mirrors web `booking/booking-event-links.ts`: paired management anchors identify a booking.
public struct BookingEventLinks: Equatable, Sendable {
    public let reservationId: String
    public let token: String
    public let cancelURL: String
    public let rescheduleURL: String

    private static let anchors = try! NSRegularExpression(
        pattern: #"href=["']([^"']*/meet/(cancel|reschedule)/([^/?#]+)\?token=([^"'#&]+)[^"']*)["']"#,
        options: .caseInsensitive)

    public static func parse(_ description: String?) -> Self? {
        guard let description, !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        let source = description as NSString
        var identity: (id: String, token: String)?
        var cancelURL: String?
        var rescheduleURL: String?
        for match in anchors.matches(in: description, range: NSRange(location: 0, length: source.length)) {
            let url = source.substring(with: match.range(at: 1))
            let kind = source.substring(with: match.range(at: 2))
            let id = source.substring(with: match.range(at: 3))
            let token = source.substring(with: match.range(at: 4))
            if let identity, identity.id != id || identity.token != token { return nil }
            identity = (id, token)
            if kind == "cancel" { cancelURL = url }
            if kind == "reschedule" { rescheduleURL = url }
        }
        guard let identity, let cancelURL, let rescheduleURL else { return nil }
        return Self(reservationId: identity.id, token: identity.token, cancelURL: cancelURL, rescheduleURL: rescheduleURL)
    }
}
