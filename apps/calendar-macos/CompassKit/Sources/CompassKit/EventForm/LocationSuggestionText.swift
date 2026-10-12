import Foundation

/// Rules for the event form's location suggestions (MapKit on macOS), kept
/// here so they are testable without MapKit.
public enum LocationSuggestionText {
    /// Fewer characters than this never query the completer.
    public static let minQueryLength = 3

    /// Most suggestions shown under the field.
    public static let maxSuggestions = 5

    public static func shouldSearch(_ query: String) -> Bool {
        query.trimmingCharacters(in: .whitespacesAndNewlines).count >= minQueryLength
    }

    /// The location saved when a suggestion is picked: "Title, Subtitle",
    /// or just the title when the subtitle is empty.
    public static func text(title: String, subtitle: String) -> String {
        let trimmedSubtitle = subtitle.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmedSubtitle.isEmpty ? title : "\(title), \(trimmedSubtitle)"
    }
}
