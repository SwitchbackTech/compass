import CompassData
import CompassKit
import SwiftUI

/// Web `FeedbackDialog`: a 480pt modal with a labeled text area, a note about
/// what is included, and Cancel (Esc) / Send feedback actions.
struct FeedbackDialogView: View {
    @Environment(\.nativeWebTheme) private var theme
    @Bindable var model: NativeCalendarRootModel
    @State private var details = ""
    @FocusState private var focused: Bool

    private var trimmed: String { details.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        if model.isFeedbackDialogPresented {
            VStack(alignment: .leading, spacing: 24) {
                ModalDialogTitle("Share feedback")
                ModalDialogMessage("Send feedback without leaving Compass.")
                VStack(alignment: .leading, spacing: 8) {
                    Text("What would you like to share?")
                        .font(.rubik(14))
                        .foregroundStyle(theme.textColor)
                    ZStack(alignment: .topLeading) {
                        TextEditor(text: $details)
                            .font(.rubik(16))
                            .foregroundStyle(theme.textColor)
                            .scrollContentBackground(.hidden)
                            .focused($focused)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 6)
                            .disabled(model.isFeedbackSubmitting)
                            .accessibilityLabel("What would you like to share?")
                            .accessibilityIdentifier("compass-feedback-details")
                            .onChange(of: details) { _, value in
                                if value.count > 5000 { details = String(value.prefix(5000)) }
                            }
                        if details.isEmpty {
                            Text("Tell us what you think.")
                                .font(.rubik(16))
                                .foregroundStyle(theme.textMutedColor)
                                .padding(.horizontal, 13)
                                .padding(.vertical, 6)
                                .allowsHitTesting(false)
                        }
                    }
                    .frame(height: 144)
                    .overlay(
                        RoundedRectangle(cornerRadius: NativeWebLayoutTokens.radiusDefault)
                            .stroke(focused ? theme.accentColor : theme.borderColor, lineWidth: 1))
                    Text("We'll include your account, app version, current view, and session details so we can follow up and troubleshoot.")
                        .font(.rubik(12))
                        .foregroundStyle(theme.textMutedColor)
                        .fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: 12) {
                    Spacer()
                    OverlayPanelActionButton("Cancel", shortcut: ["Esc"]) { model.closeFeedbackDialog() }
                        .keyboardShortcut(.cancelAction)
                        .disabled(model.isFeedbackSubmitting)
                    OverlayPanelActionButton(
                        model.isFeedbackSubmitting ? "Sending…" : "Send feedback",
                        variant: .primary,
                        shortcut: ["Mod", "Enter"]
                    ) { Task { await model.submitFeedback(details) } }
                        .keyboardShortcut(.return, modifiers: .command)
                        .disabled(trimmed.isEmpty || model.isFeedbackSubmitting)
                }
            }
            .accessibilityAddTraits(.isModal)
            .modalDialogChrome(maxWidth: 480, identifier: "compass-feedback-dialog")
            .onAppear { focused = true }
        }
        Color.clear.frame(width: 0, height: 0)
            .onChange(of: model.isFeedbackDialogPresented) { _, presented in
                if presented { details = "" }
            }
    }
}
