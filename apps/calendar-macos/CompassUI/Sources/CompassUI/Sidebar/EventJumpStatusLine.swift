import CompassData
import CompassKit
import SwiftUI

/// Web `EventJumpIndicator` + all-day create tip while a day column is selected.
struct EventJumpStatusLine: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    var body: some View {
        if let text = model.eventJumpStatusText {
            Text(text)
                .font(.rubik(11))
                .foregroundStyle(theme.textMutedColor)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .accessibilityIdentifier("compass-native-event-jump-status")
        }
    }
}
