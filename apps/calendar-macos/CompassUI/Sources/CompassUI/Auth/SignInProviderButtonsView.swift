import CompassData
import SwiftUI

struct SignInProviderButtonsView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var authStore: AuthStore

    var body: some View {
        VStack(spacing: 10) {
            ForEach(authStore.availableSignInProviders(), id: \.self) { kind in
                AuthPrimaryButton(
                    title: kind.continueLabel,
                    disabled: authStore.isSubmitting,
                    isLoading: authStore.isSubmitting)
                {
                    authStore.signInWithProvider(kind)
                }
            }
        }
    }
}
