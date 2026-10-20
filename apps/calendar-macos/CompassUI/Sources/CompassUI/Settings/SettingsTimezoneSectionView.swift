import CompassData
import CompassKit
import SwiftUI

struct SettingsTimezoneSectionView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var settingsStore: SettingsStore
    @Bindable var viewStore: ViewStore

    private var label: String {
        let effective = viewStore.effectiveTimeZone
        let abbrev = TimeZoneFormatting.abbreviation(for: effective)
        if viewStore.pinnedTimeZone == nil {
            return "Auto (\(abbrev))"
        }
        return "\(TimeZoneFormatting.cityName(for: effective)) (\(abbrev))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Default timezone")
                .font(.rubik(15))
                .foregroundStyle(theme.textColor)
            Button(label) {
                settingsStore.openTimezoneDialog(.pin)
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(theme.surfaceOverlayColor)
            .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault))
            .overlay(
                RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                    .stroke(theme.borderColor, lineWidth: 1)
            )
            .foregroundStyle(theme.textColor)
            .font(.rubik(13))
        }
        .accessibilityIdentifier("settings-section-timezone")
    }
}
