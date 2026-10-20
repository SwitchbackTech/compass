import CompassData
import CompassKit
import SwiftUI

public struct SettingsWindowOverlay: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable public var model: NativeCalendarRootModel

    public init(model: NativeCalendarRootModel) {
        self.model = model
    }

    public var body: some View {
        if model.settingsStore.isPresented {
            GeometryReader { geometry in
                ZStack {
                    theme.panelBackdropColor
                        .ignoresSafeArea()
                        .onTapGesture { model.closeSettingsIfAllowed() }
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(alignment: .center) {
                            Text("Settings")
                                .font(.rubik(18))
                                .foregroundStyle(theme.textColor)
                            Spacer(minLength: 8)
                            Button("Close") { model.closeSettingsIfAllowed() }
                                .buttonStyle(.plain)
                                .font(.rubik(14))
                                .foregroundStyle(theme.textMutedColor)
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                        .padding(.bottom, 8)
                        HStack(alignment: .top, spacing: 0) {
                            nav
                            Divider().overlay(theme.borderColor)
                            content
                        }
                    }
                    .frame(
                        width: min(640, max(0, geometry.size.width - 32)),
                        height: min(620, max(0, geometry.size.height - 32))
                    )
                    .overlayPanelChrome()
                }
            }
            .accessibilityIdentifier("compass-native-settings")
        }
        if model.settingsStore.timezoneDialogPurpose != nil {
            TimezonePickerDialogView(
                settingsStore: model.settingsStore,
                viewStore: model.viewStore)
        }
    }

    private var nav: some View {
        VStack(alignment: .leading, spacing: 8) {
            navButton("Accounts", page: .accounts)
            if model.settingsHasMeetings {
                navButton("Meetings", page: .booking, attention: model.bookingStore.bookingNeedsAttention)
            }
            if model.settingsHasBilling {
                navButton("Billing", page: .billing)
            }
            if !model.focusStore.pageJumpHintsVisible {
                HStack(spacing: 4) {
                    Text("Hold")
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                    ShortcutHintChip(label: "^")
                    Text("to see shortcuts.")
                        .font(.rubik(11))
                        .foregroundStyle(theme.textMutedColor)
                }
                .padding(.top, 4)
            }
            Spacer(minLength: 0)
        }
        .padding(20)
        .frame(width: 128, alignment: .leading)
    }

    private func navButton(_ title: String, page: SettingsPage, attention: Bool = false) -> some View {
        Button(title) { model.settingsStore.page = page }
            .buttonStyle(.plain)
            .font(.rubik(14))
            .foregroundStyle(model.settingsStore.page == page ? theme.textColor : theme.textMutedColor)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .trailing) {
                if attention {
                    Circle()
                        .fill(theme.warningColor)
                        .frame(width: 6, height: 6)
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        VStack(alignment: .leading, spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if model.settingsStore.page == .billing {
                        billingContent
                    } else if model.settingsStore.page == .booking {
                        SettingsBookingSectionView(model: model)
                    } else {
                        accountsContent
                    }
                }
                .padding(16)
            }
            if model.settingsStore.page == .accounts {
                Divider().overlay(theme.borderColor)
                SettingsDataActionsSectionView(model: model)
                    .padding(16)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var accountsContent: some View {
        Group {
            SettingsTimezoneSectionView(
                settingsStore: model.settingsStore,
                viewStore: model.viewStore)
            SettingsDefaultCalendarSectionView(
                settingsStore: model.settingsStore,
                calendars: model.calendars,
                hasConnectedAccount: !model.syncConnectionsStore.connections.isEmpty)
            if model.isSignedIn {
                SettingsThemeSectionView(settingsStore: model.settingsStore)
                SettingsLaunchAtLoginSectionView(settingsStore: model.settingsStore)
                SettingsQuickAddHotkeySectionView(settingsStore: model.settingsStore)
                SettingsAccountsSectionView(syncStore: model.syncConnectionsStore)
            } else {
                SettingsUnsignedAccountsSectionView()
            }
        }
    }

    private var billingContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Billing")
                .font(.rubik(15))
                .foregroundStyle(theme.textColor)
            BillingPlanSectionView(billingStore: model.billingStore)
        }
        .accessibilityIdentifier("settings-section-billing")
    }
}
