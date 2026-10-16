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
            ZStack {
                theme.panelBackdropColor
                    .ignoresSafeArea()
                    .onTapGesture { model.closeSettingsIfAllowed() }
                HStack(alignment: .top, spacing: 0) {
                    nav
                    Divider().overlay(theme.borderColor)
                    content
                }
                .frame(width: 640, height: 620)
                .overlayPanelChrome()
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
            Text("Settings")
                .font(.rubik(18))
                .foregroundStyle(theme.textColor)
            navButton("Accounts", page: .accounts)
            if model.settingsHasMeetings {
                navButton("Meetings", page: .booking, attention: model.bookingStore.bookingNeedsAttention)
            }
            if model.settingsHasBilling {
                navButton("Billing", page: .billing)
            }
            Spacer()
            Button("Close") { model.closeSettingsIfAllowed() }
                .buttonStyle(.plain)
                .foregroundStyle(theme.textMutedColor)
        }
        .padding(20)
        .frame(width: 180, alignment: .leading)
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
                VStack(alignment: .leading, spacing: 16) {
                    if model.settingsStore.page == .billing {
                        billingContent
                    } else if model.settingsStore.page == .booking {
                        SettingsBookingSectionView(model: model)
                    } else {
                        accountsContent
                    }
                }
                .padding(20)
            }
            if model.settingsStore.page == .accounts {
                Divider().overlay(theme.borderColor)
                SettingsDataActionsSectionView(model: model)
                    .padding(20)
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
            SettingsThemeSectionView(settingsStore: model.settingsStore)
            SettingsLaunchAtLoginSectionView(settingsStore: model.settingsStore)
            SettingsQuickAddHotkeySectionView(settingsStore: model.settingsStore)
            if model.isSignedIn {
                SettingsAccountsSectionView(syncStore: model.syncConnectionsStore)
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
