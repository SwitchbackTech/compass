import SwiftUI

/// Web `AccountsSection` empty state for signed-out settings.
struct SettingsUnsignedAccountsSectionView: View {
    @Environment(\.nativeWebTheme) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Accounts")
                .font(.rubik(15))
                .foregroundStyle(theme.textColor)
            Text("No accounts connected yet.")
                .font(.rubik(13))
                .foregroundStyle(theme.textMutedColor)
            Text(
                "Pick Google, Microsoft, or Apple. Or keep using this device only from the calendar list."
            )
            .font(.rubik(13))
            .foregroundStyle(theme.textMutedColor)
        }
        .accessibilityIdentifier("settings-section-accounts")
    }
}
