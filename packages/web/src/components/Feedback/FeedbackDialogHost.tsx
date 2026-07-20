import { useState } from "react";
import { usePostHog } from "@web/auth/posthog/posthog-react";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { FeedbackDialog } from "@web/components/Feedback/FeedbackDialog";
import { captureFeedback } from "@web/components/Feedback/feedback.posthog";
import {
  feedbackActions,
  selectFeedbackRequest,
  useFeedbackStore,
} from "@web/components/Feedback/feedback.store";

const restoreCommandPaletteFocus = () => {
  document
    .querySelector<HTMLButtonElement>(
      'button[aria-label^="Open command palette"]',
    )
    ?.focus();
};

export function FeedbackDialogHost() {
  const request = useFeedbackStore(selectFeedbackRequest);
  const posthog = usePostHog();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request) return null;

  const handleSubmit = async (details: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await captureFeedback(posthog, { ...request, details });
    } catch {
      setIsSubmitting(false);
      showErrorToast("Couldn't send your feedback. Please try again.");
      return;
    }

    setIsSubmitting(false);
    feedbackActions.close();
    showStatusToast("feedback-sent", "Thanks — your feedback was sent.");
  };

  return (
    <FeedbackDialog
      kind={request.kind}
      isSubmitting={isSubmitting}
      onDismiss={feedbackActions.close}
      restoreFocus={restoreCommandPaletteFocus}
      onSubmit={handleSubmit}
    />
  );
}
