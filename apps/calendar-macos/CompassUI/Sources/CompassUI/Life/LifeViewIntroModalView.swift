import CompassData
import CompassKit
import SwiftUI

/// Mirrors web `LifeViewIntroModal`.
struct LifeViewIntroModalView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    @FocusState private var primaryFocused: Bool

    var body: some View {
        ZStack {
            PanelBackdropView()
                .ignoresSafeArea()
            ScrollView {
                panel
                    .frame(maxWidth: .infinity, alignment: .top)
                    .padding(.top, 32)
                    .padding(.bottom, 32)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .opacity(model.lifeViewIntroStore.isClosing ? 0 : 1)
        .animation(.easeOut(duration: 0.2), value: model.lifeViewIntroStore.isClosing)
        .onAppear {
            primaryFocused = true
            model.refreshLifeViewIntro()
        }
    }

    private var panel: some View {
        VStack(alignment: .leading, spacing: 24) {
            PixelPirateView()
                .frame(width: 56, height: 56)
            VStack(alignment: .leading, spacing: 8) {
                Text(LifeViewIntroCopy.title)
                    .font(.rubik(24, weight: .bold))
                    .foregroundStyle(theme.textColor)
                Text(LifeViewIntroCopy.body)
                    .font(.rubik(16))
                    .foregroundStyle(theme.textMutedColor)
            }
            Button {
                model.dismissLifeViewIntro(reason: .primary)
            } label: {
                HStack(spacing: 6) {
                    Text(LifeViewIntroCopy.primaryLabel)
                        .font(.rubik(14, weight: .medium))
                    ShortcutHintChip(label: "Enter")
                }
                .foregroundStyle(theme.onAccentColor)
                .frame(maxWidth: .infinity, minHeight: 40)
                .background(theme.accentColor)
                .clipShape(Capsule())
                .shadow(color: theme.shadowDefaultColor, radius: 6, y: 3)
            }
            .buttonStyle(.plain)
            .focused($primaryFocused)
        }
        .padding(28)
        .frame(width: 480)
        // Web Life intro overrides the shared panel with a surface fill and border.
        .background(theme.surfaceColor)
        .clipShape(RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusPanel))
        .overlay {
            RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusPanel)
                .stroke(theme.borderColor, lineWidth: 1)
        }
        .shadow(color: theme.shadowDefaultColor, radius: 12, y: 10)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
        .accessibilityLabel(LifeViewIntroCopy.title)
        .accessibilityIdentifier("compass-native-life-view-intro-modal")
    }
}
