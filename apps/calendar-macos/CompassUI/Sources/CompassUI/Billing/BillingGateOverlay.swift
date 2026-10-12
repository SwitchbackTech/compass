import CompassData
import CompassKit
import SwiftUI

public struct BillingGateOverlay: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable public var billingStore: BillingStore

    public init(billingStore: BillingStore) {
        self.billingStore = billingStore
    }

    public var body: some View {
        if let status = billingStore.gateStatus {
            let copy = BillingGateCopy.content(for: status)
            ZStack {
                theme.panelBackdropColor
                    .ignoresSafeArea()
                VStack(spacing: 16) {
                    Text(copy.title)
                        .font(.rubik(20))
                        .foregroundStyle(theme.textColor)
                        .multilineTextAlignment(.center)
                    Text(copy.body)
                        .font(.rubik(13))
                        .foregroundStyle(theme.textMutedColor)
                        .multilineTextAlignment(.center)
                    if let actionError = billingStore.actionError {
                        Text(actionError)
                            .font(.rubik(12))
                            .foregroundStyle(theme.warningColor)
                    }
                    Button {
                        billingStore.openCheckoutFromGate()
                    } label: {
                        Group {
                            if billingStore.isOpeningHostedSession {
                                ProgressView().controlSize(.small)
                            } else {
                                Text(copy.primaryLabel)
                                    .font(.rubik(14))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                    }
                    .buttonStyle(.plain)
                    .background(theme.textColor)
                    .foregroundStyle(theme.backgroundColor)
                    .clipShape(Capsule())
                    .disabled(billingStore.isOpeningHostedSession)
                }
                .padding(OverlayPanelChrome.padding)
                .frame(maxWidth: 420)
                .overlayPanelChrome()
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("compass-native-billing-gate")
            }
            .onAppear {
                billingStore.trackGateShownIfNeeded()
            }
        }
    }
}
