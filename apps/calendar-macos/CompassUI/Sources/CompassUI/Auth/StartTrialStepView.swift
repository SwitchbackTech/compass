import CompassData
import CompassKit
import SwiftUI

struct StartTrialStepView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var authStore: AuthStore
    @Bindable var billingStore: BillingStore

    var body: some View {
        VStack(spacing: 16) {
            Text(
                AccountChoiceCopy.welcomeTrialCardTermsLine(
                    trialLengthDays: authStore.signupTrialLengthDays()))
                .font(.rubik(13))
                .foregroundStyle(theme.textMutedColor)
                .multilineTextAlignment(.center)

            AuthPrimaryButton(
                title: billingStore.isOpeningHostedSession ? "Opening checkout…" : "Add card",
                disabled: billingStore.isOpeningHostedSession,
                isLoading: billingStore.isOpeningHostedSession
            ) {
                Task {
                    await billingStore.openHostedCheckout()
                    authStore.closeModal()
                }
            }

            AuthLinkButton(title: "Back") {
                authStore.closeModal()
            }
        }
        .onAppear {
            Task { await billingStore.refreshStatus() }
        }
    }
}
