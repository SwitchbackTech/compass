import AppKit
import CompassData
import CompassKit
import SwiftUI
import XCTest
@testable import CompassUI

@MainActor
final class EventFormTimeZoneTests: XCTestCase {
    func testNativeDateControlsUsePinnedCalendarTimeZone() async throws {
        let savedZone = EffectiveTimeZone.identifier
        defer { EffectiveTimeZone.identifier = savedZone }
        EffectiveTimeZone.identifier = "Pacific/Auckland"
        let environment = try NativeCalendarEnvironment(
            inMemoryDatabase: true, sessionStore: MemorySessionStore(tokens: nil))
        let model = NativeCalendarRootModel(
            environment: environment, demoPresentation: try DemoSeedFixture.load())
        await model.start()
        XCTAssertTrue(model.viewStore.setPinnedTimeZone("Pacific/Auckland"))
        model.createTimedDraft(activity: .createShortcut)
        model.openEventFormForCurrentDraft()
        let host = NSHostingView(rootView: EventFormView(model: model))
        host.frame = NSRect(x: 0, y: 0, width: 345, height: 800)
        host.layoutSubtreeIfNeeded()
        let startFields = views(matching: "compass-event-form-start-date", in: host)
        let endFields = views(matching: "compass-event-form-end-date", in: host)
        XCTAssertEqual(startFields.count, 1)
        XCTAssertEqual(endFields.count, 1)
        XCTAssertEqual(EffectiveTimeZone.calendar.timeZone.identifier, "Pacific/Auckland")
    }

    private func views(matching identifier: String, in view: NSView) -> [NSView] {
        var found: [NSView] = []
        if view.accessibilityIdentifier() == identifier {
            found.append(view)
        }
        for subview in view.subviews {
            found.append(contentsOf: views(matching: identifier, in: subview))
        }
        return found
    }
}
