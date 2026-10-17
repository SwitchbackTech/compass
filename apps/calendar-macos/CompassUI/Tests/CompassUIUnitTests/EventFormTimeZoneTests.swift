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
        let controls = datePickers(in: host)
        XCTAssertEqual(controls.count, 2)
        for control in controls {
            XCTAssertEqual(control.timeZone?.identifier, "Pacific/Auckland")
        }
    }

    private func datePickers(in view: NSView) -> [NSDatePicker] {
        (view as? NSDatePicker).map { [$0] } ?? view.subviews.flatMap { datePickers(in: $0) }
    }
}
