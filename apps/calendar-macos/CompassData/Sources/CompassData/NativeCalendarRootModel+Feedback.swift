import Foundation

/// Web `FeedbackDialogHost`: an in-app dialog that sends the details to PostHog
/// and answers with a toast, instead of a system alert.
extension NativeCalendarRootModel {
    public func openFeedbackDialog() {
        guard !isFeedbackDialogPresented else { return }
        isFeedbackSubmitting = false
        isFeedbackDialogPresented = true
    }

    public func closeFeedbackDialog() {
        guard !isFeedbackSubmitting else { return }
        isFeedbackDialogPresented = false
    }

    /// Sends trimmed details. Empty text is ignored. On failure the dialog stays
    /// open with an error toast so the text is not lost, like web.
    public func submitFeedback(_ details: String) async {
        let trimmed = details.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isFeedbackSubmitting else { return }
        isFeedbackSubmitting = true
        defer { isFeedbackSubmitting = false }
        do {
            try await feedbackSender?(trimmed, viewStore.view.rawValue)
        } catch {
            statusToastStore.show(
                id: "feedback-error", message: "Couldn't send your feedback. Please try again.")
            return
        }
        isFeedbackDialogPresented = false
        statusToastStore.show(id: "feedback-sent", message: "Feedback sent to the big boss, thanks!")
    }
}
