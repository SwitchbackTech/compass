import CompassKit
import MapKit
import Observation

/// Apple Maps address suggestions for the event form's location field.
/// MapKit needs no API key, unlike the web app's Google Places source, so
/// suggestions can differ a little between the two apps. The saved value is
/// plain text either way.
@MainActor
@Observable
final class LocationCompleter: NSObject {
    private(set) var suggestions: [String] = []
    @ObservationIgnored private let completer = MKLocalSearchCompleter()

    override init() {
        super.init()
        completer.resultTypes = [.address, .pointOfInterest]
        completer.delegate = self
    }

    func update(query: String) {
        guard LocationSuggestionText.shouldSearch(query) else {
            clear()
            return
        }
        completer.queryFragment = query.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func clear() {
        completer.cancel()
        suggestions = []
    }
}

extension LocationCompleter: @preconcurrency MKLocalSearchCompleterDelegate {
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        suggestions = completer.results
            .prefix(LocationSuggestionText.maxSuggestions)
            .map { LocationSuggestionText.text(title: $0.title, subtitle: $0.subtitle) }
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: any Error) {
        suggestions = []
    }
}
