import SwiftUI

/// Web `AccountsSection` empty state for signed-out settings.
struct SettingsUnsignedAccountsSectionView: View {
    @Environment(\.nativeWebTheme) private var theme

    var body: some View {
        // Web shows no section heading; the nav already says Accounts.
        VStack(alignment: .leading, spacing: 12) {
            Text("No accounts connected yet.")
                .font(.rubik(14))
                .foregroundStyle(theme.textMutedColor)
            Text(
                "Pick Google, Microsoft, or Apple. Or keep using this device only from the calendar list."
            )
            .font(.rubik(12))
            .foregroundStyle(theme.textMutedColor)
        }
        .accessibilityIdentifier("settings-section-accounts")
    }
}
