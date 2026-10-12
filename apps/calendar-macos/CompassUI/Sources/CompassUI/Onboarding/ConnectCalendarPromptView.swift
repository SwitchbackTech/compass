import CompassData
import CompassKit
import SwiftUI

struct ConnectCalendarPromptView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    var body: some View {
        ZStack {
            theme.panelBackdropColor
                .ignoresSafeArea()
            VStack(alignment: .leading, spacing: 16) {
                Text("Connect the calendar you use")
                    .font(.rubik(22))
                    .foregroundStyle(theme.textColor)
                    .accessibilityAddTraits(.isHeader)
                Text("Compass stays in sync with your existing calendars.")
                    .font(.rubik(14))
                    .foregroundStyle(theme.textMutedColor)
                providerButtons
                Button("Skip for now, my calendar stays empty") {
                    model.onboardingStore.snoozeConnectCalendarPrompt()
                }
                .buttonStyle(.plain)
                .font(.rubik(12))
                .foregroundStyle(theme.textMutedColor)
                .frame(maxWidth: .infinity)
            }
            .padding(OverlayPanelChrome.padding)
            .frame(maxWidth: 480)
            .overlayPanelChrome()
            .accessibilityElement(children: .contain)
            .accessibilityAddTraits(.isModal)
            .accessibilityLabel("Connect the calendar you use")
            .accessibilityIdentifier("compass-native-connect-calendar-prompt")
        }
    }

    @ViewBuilder
    private var providerButtons: some View {
        ForEach(model.connectCalendarProviderKinds, id: \.self) { kind in
            Button(providerLabel(kind)) {
                Task { await model.connectCalendar(provider: kind) }
            }
            .buttonStyle(.plain)
            .foregroundStyle(theme.textColor)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(theme.borderColor.opacity(0.35))
            .clipShape(Capsule())
        }
    }

    private func providerLabel(_ kind: SignInProviderKind) -> String {
        switch kind {
        case .google: "Connect Google Calendar"
        case .microsoft: "Connect Microsoft Calendar"
        case .apple: "Connect iCloud Calendar"
        }
    }
}
