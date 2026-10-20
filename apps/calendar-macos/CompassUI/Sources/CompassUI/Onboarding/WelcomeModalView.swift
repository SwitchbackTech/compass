import AppKit
import CompassData
import CompassKit
import SwiftUI

/// Mirrors web `WelcomeModal`: commit (1), learn (2), choose how to start (3).
/// Keys (Enter, Esc, I, S, U, provider letters, FAQ digits) are routed by
/// `NativeGridKeyboardRouter` through the same model actions as the buttons.
struct WelcomeModalView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel

    private var step: Int { model.onboardingStore.welcomeStep }

    var body: some View {
        ZStack {
            PanelBackdropView()
                .ignoresSafeArea()
            ScrollView {
                panel
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
            }
        }
        .onAppear {
            model.onboardingStore.setWelcomeFirstVisitOpen(true)
            model.onboardingStore.trackWelcomeShownIfNeeded()
        }
        .onDisappear {
            model.onboardingStore.setWelcomeFirstVisitOpen(false)
        }
    }

    private var panel: some View {
        VStack(alignment: .leading, spacing: 20) {
            headerRow
            stepContent
            stepDots
            if step == 3 {
                WelcomeLinksView()
            }
        }
        .padding(28)
        .frame(width: 480)
        .background(theme.surfacePanelColor)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.1), radius: 20, y: 10)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isModal)
        .accessibilityLabel("Welcome to Compass Calendar")
        .accessibilityIdentifier("compass-native-welcome-modal")
    }

    private var headerRow: some View {
        HStack {
            PixelPirateView()
                .frame(width: 56, height: 56)
                .help("No signup required")
            Spacer()
            if step > 1 {
                pillButton(title: "Back", hint: "Esc") { model.welcomeBack() }
            }
            pillButton(title: "Log in", hint: "i") { model.welcomeLogIn() }
        }
    }

    @ViewBuilder
    private var stepContent: some View {
        switch step {
        case 1:
            VStack(alignment: .leading, spacing: 8) {
                heading("The Keyboard Calendar")
                Text(
                    "Rediscover the joy of shortcuts as you build your perfect schedule. "
                        + "Click any button here, or use Enter and the key hints beside each action.")
                    .font(.rubik(16))
                    .foregroundStyle(theme.textMutedColor)
                Text(
                    "Compass is a faster, simpler, open-source calendar for busy professionals "
                        + "who live at their keyboard.")
                    .font(.rubik(14))
                    .foregroundStyle(theme.textMutedColor)
            }
            VStack(spacing: 12) {
                primaryButton(title: "Get started for free", hint: "Enter") { model.welcomePrimaryAction() }
                Text("No account needed.")
                    .font(.rubik(12))
                    .foregroundStyle(theme.textMutedColor)
            }
        case 2:
            VStack(alignment: .leading, spacing: 8) {
                heading("How Compass works")
                Text("Click a question or press its number to open it.")
                    .font(.rubik(16))
                    .foregroundStyle(theme.textMutedColor)
            }
            WelcomeFaqListView(expanded: model.onboardingStore.welcomeFaqExpanded) { index in
                model.onboardingStore.toggleWelcomeFaq(index)
            }
            primaryButton(title: "Next", hint: "Enter") { model.welcomePrimaryAction() }
        default:
            VStack(alignment: .leading, spacing: 8) {
                heading("Let's get started")
                Text("Connect a calendar or start fresh")
                    .font(.rubik(16))
                    .foregroundStyle(theme.textMutedColor)
            }
            VStack(spacing: 12) {
                primaryButton(title: AccountChoiceCopy.localDeviceOnlyLabel, hint: "S") {
                    model.welcomeExplore()
                }
                Text(AccountChoiceCopy.localDeviceOnlySubtitle)
                    .font(.rubik(14))
                    .foregroundStyle(theme.textMutedColor)
                VStack(spacing: 4) {
                    Text(AccountChoiceCopy.connectCalendarAccountLabel)
                        .font(.rubik(14, weight: .semibold))
                        .foregroundStyle(theme.textColor)
                    Text(AccountChoiceCopy.connectCalendarAccountHelper)
                        .font(.rubik(14))
                        .foregroundStyle(theme.textMutedColor)
                }
                .frame(maxWidth: .infinity)
                Text("Ready to keep it? Start your free 7-day trial.")
                    .font(.rubik(14))
                    .foregroundStyle(theme.textMutedColor)
                ForEach(model.authStore.availableSignInProviders(), id: \.self) { provider in
                    secondaryButton(title: provider.continueLabel, hint: String(provider.shortcutLetter).uppercased()) {
                        model.welcomeSignIn(with: provider)
                    }
                }
                secondaryButton(
                    title: model.authStore.availableSignInProviders().isEmpty ? "Sign up" : "Sign up with email",
                    hint: "U"
                ) {
                    model.welcomeSignUp()
                }
            }
        }
    }

    private var stepDots: some View {
        HStack(spacing: 8) {
            ForEach(1 ... 3, id: \.self) { dot in
                Circle()
                    .fill(dot == step ? theme.textColor : theme.borderColor)
                    .frame(width: 6, height: 6)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement()
        .accessibilityLabel("Step \(step) of 3")
    }

    private func heading(_ title: String) -> some View {
        Text(title)
            .font(.rubik(24, weight: .bold))
            .foregroundStyle(theme.textColor)
    }

    private func primaryButton(title: String, hint: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.rubik(14, weight: .medium))
                ShortcutHintChip(label: hint)
            }
            .foregroundStyle(theme.surfaceColor)
            .frame(maxWidth: .infinity, minHeight: 40)
            .background(theme.accentColor)
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
        }
        .buttonStyle(.plain)
    }

    private func secondaryButton(title: String, hint: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.rubik(14, weight: .medium))
                ShortcutHintChip(label: hint)
            }
            .foregroundStyle(theme.textColor)
            .frame(maxWidth: .infinity, minHeight: 40)
            .background(theme.surfaceColor)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(theme.borderColor, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func pillButton(title: String, hint: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.rubik(12, weight: .medium))
                ShortcutHintChip(label: hint)
            }
            .foregroundStyle(theme.textColor)
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
            .background(theme.surfaceColor)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(theme.borderColor, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
