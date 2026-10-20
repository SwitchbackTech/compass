import CompassData
import CompassKit
import SwiftUI

/// Exposes parity layout dimensions for XCUITest (desktop ↔ web screenshots).
struct ParityLayoutProbe: ViewModifier {
    @Bindable var model: NativeCalendarRootModel

    func body(content: Content) -> some View {
        if UITestLaunchPolicy.isParityCapture {
            content
                .accessibilityElement()
                .accessibilityIdentifier("compass-parity-layout-probe")
                .accessibilityValue(parityLayoutLabel)
        } else {
            content
        }
    }

    private var parityLayoutLabel: String {
        "\(Int(model.contentTrackWidth))-\(model.viewStore.visibleDayCount)"
    }
}
