import CompassData
import CompassKit
import SwiftUI

struct SettingsDataActionsSectionView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    var body: some View {
        HStack(spacing: 12) {
            settingsActionButton(
                title: model.isExportingLocalData ? "Exporting…" : "Export data",
                variant: .secondary,
                identifier: "settings-export-data",
                disabled: model.isExportingLocalData
            ) {
                Task { await model.exportLocalData() }
            }
            settingsActionButton(
                title: "Delete account",
                variant: .destructive,
                identifier: "settings-delete-account"
            ) {
                model.requestDeleteAccount()
            }
            if model.isSignedIn {
                settingsActionButton(
                    title: "Log out",
                    variant: .secondary,
                    identifier: "settings-log-out",
                    disabled: model.isLoggingOut
                ) {
                    model.requestLogout()
                }
            }
        }
        .accessibilityIdentifier("settings-section-data-actions")
    }

    private enum ActionVariant {
        case secondary
        case destructive
    }

    private func settingsActionButton(
        title: String,
        variant: ActionVariant,
        identifier: String,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.rubik(14))
                .foregroundStyle(variant == .destructive ? theme.onAccentColor : theme.textColor)
                .padding(.horizontal, 16)
                .frame(minHeight: 44)
                .background {
                    RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                        .fill(variant == .destructive ? theme.errorColor : theme.surfaceOverlayColor)
                        .overlay {
                            if variant == .secondary {
                                RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                                    .stroke(theme.borderColor, lineWidth: 1)
                            }
                        }
                }
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .accessibilityIdentifier(identifier)
    }
}
