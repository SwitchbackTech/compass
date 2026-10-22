import CompassData
import CompassKit
import SwiftUI

struct StartTrialStepView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var authStore: AuthStore
    @Bindable var billingStore: BillingStore

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(AccountChoiceCopy.signupTrialStepTermsLine)
                .font(.rubik(13))
                .foregroundStyle(theme.textMutedColor)
                .multilineTextAlignment(.leading)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity, alignment: .leading)

            trialPrimaryButton

            trialBackButton
        }
        .onAppear {
            Task { await billingStore.refreshStatus() }
        }
    }

    private var trialPrimaryButton: some View {
        Button {
            Task {
                await billingStore.openHostedCheckout()
                authStore.closeModal()
            }
        } label: {
            HStack(spacing: 6) {
                if billingStore.isOpeningHostedSession {
                    ProgressView()
                        .controlSize(.small)
                }
                Text(
                    billingStore.isOpeningHostedSession
                        ? "Opening checkout…"
                        : "Start free trial")
                    .font(.rubik(14, weight: .medium))
                if !billingStore.isOpeningHostedSession {
                    ShortcutHintChip(label: "Enter")
                }
            }
            .foregroundStyle(theme.surfaceColor)
            .frame(maxWidth: .infinity, minHeight: 40)
            .background(
                billingStore.isOpeningHostedSession
                    ? theme.textMutedColor
                    : theme.accentColor)
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
        }
        .buttonStyle(.plain)
        .disabled(billingStore.isOpeningHostedSession)
    }

    private var trialBackButton: some View {
        Button {
            authStore.closeModal()
        } label: {
            HStack(spacing: 6) {
                Text("Back")
                    .font(.rubik(13))
                ShortcutHintChip(label: "Esc")
            }
            .foregroundStyle(theme.accentSecondaryColor)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
