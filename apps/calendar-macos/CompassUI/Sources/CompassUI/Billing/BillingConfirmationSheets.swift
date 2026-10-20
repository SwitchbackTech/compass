import CompassData
import SwiftUI

public struct BillingUpgradeConfirmationSheet: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable public var billingStore: BillingStore

    public init(billingStore: BillingStore) {
        self.billingStore = billingStore
    }

    public var body: some View {
        if billingStore.isUpgradeConfirmationPresented {
            let dismiss = { billingStore.isUpgradeConfirmationPresented = false }
            BillingDialogPanel(
                title: "Start Premium now?",
                message: "Premium starts right away and the card on file is charged today. Everything in your calendar keeps working, and the trial badge goes away. Manage billing opens your invoices and card on file. It does not charge you or end the trial.",
                onDismiss: dismiss
            ) {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 12) {
                        OverlayPanelActionButton(
                            billingStore.isSubmitting ? "Starting Premium…" : "Start Premium",
                            variant: .primary,
                            shortcut: ["Enter"]
                        ) { Task { await billingStore.endTrialEarly() } }
                        .keyboardShortcut(.defaultAction)
                        OverlayPanelActionButton("Cancel", shortcut: ["Esc"], action: dismiss)
                            .keyboardShortcut(.cancelAction)
                    }
                    OverlayPanelActionButton("Manage billing", variant: .ghost, shortcut: ["M"]) {
                        dismiss()
                        billingStore.openSettings()
                    }
                    .keyboardShortcut("m", modifiers: [])
                }
                .disabled(billingStore.isSubmitting)
            }
        }
    }
}

public struct BillingCancelConfirmationSheet: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable public var billingStore: BillingStore
    public let periodEndLabel: String
    public let isTrialing: Bool

    public init(billingStore: BillingStore, periodEndLabel: String, isTrialing: Bool) {
        self.billingStore = billingStore
        self.periodEndLabel = periodEndLabel
        self.isTrialing = isTrialing
    }

    public var body: some View {
        if billingStore.isCancelConfirmationPresented {
            let message = isTrialing
                ? "You keep access until the trial ends on \(periodEndLabel). You can resume any time before then."
                : "Your plan stays active until \(periodEndLabel). You can resume any time before then."
            let dismiss = {
                guard !billingStore.isSubmitting else { return }
                billingStore.isCancelConfirmationPresented = false
            }
            BillingDialogPanel(title: "Cancel your plan?", message: message, onDismiss: dismiss) {
                HStack(spacing: 12) {
                    OverlayPanelActionButton(
                        billingStore.isSubmitting ? "Canceling…" : "Cancel subscription",
                        variant: .destructive,
                        shortcut: ["Enter"]
                    ) { Task { await billingStore.cancelSubscriptionAtPeriodEnd() } }
                    .keyboardShortcut(.defaultAction)
                    OverlayPanelActionButton("Keep plan", shortcut: ["Esc"], action: dismiss)
                        .keyboardShortcut(.cancelAction)
                }
                .disabled(billingStore.isSubmitting)
            }
        }
    }
}

/// Web `OverlayPanel` modal with a title, message, and start-aligned actions.
private struct BillingDialogPanel<Actions: View>: View {
    let title: String
    let message: String
    let onDismiss: () -> Void
    @ViewBuilder let actions: Actions

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            ModalDialogTitle(title)
            ModalDialogMessage(message)
            actions
        }
        .accessibilityAddTraits(.isModal)
        .modalDialogChrome(maxWidth: 400, identifier: "compass-billing-dialog")
        .onExitCommand(perform: onDismiss)
    }
}
