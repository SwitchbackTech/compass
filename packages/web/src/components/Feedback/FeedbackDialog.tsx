import { type FormEvent, useId, useState } from "react";
import { type FeedbackKind } from "@web/components/Feedback/feedback.store";
import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";

const DIALOG_COPY = {
  bug: {
    title: "Report a bug",
    label: "What went wrong?",
    placeholder: "What happened? What did you expect instead?",
    submitLabel: "Send bug report",
  },
  suggestion: {
    title: "Share a suggestion",
    label: "What would make Compass better?",
    placeholder: "Tell us what you'd like to see.",
    submitLabel: "Send suggestion",
  },
} satisfies Record<
  FeedbackKind,
  {
    title: string;
    label: string;
    placeholder: string;
    submitLabel: string;
  }
>;

interface FeedbackDialogProps {
  kind: FeedbackKind;
  isSubmitting?: boolean;
  onDismiss: () => void;
  restoreFocus?: () => void;
  onSubmit: (details: string) => void | Promise<void>;
}

export function FeedbackDialog({
  kind,
  isSubmitting = false,
  onDismiss,
  restoreFocus,
  onSubmit,
}: FeedbackDialogProps) {
  const [details, setDetails] = useState("");
  const textareaId = useId();
  const contextId = useId();
  const copy = DIALOG_COPY[kind];
  const handleDismiss = () => {
    if (!isSubmitting) onDismiss();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedDetails = details.trim();
    if (trimmedDetails) onSubmit(trimmedDetails);
  };

  return (
    <OverlayPanel
      title={copy.title}
      message="Send feedback without leaving Compass."
      onDismiss={handleDismiss}
      restoreFocus={restoreFocus}
      align="start"
      variant="modal"
      widthClassName="w-[480px]"
    >
      <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-text" htmlFor={textareaId}>
            {copy.label}
          </label>
          <textarea
            id={textareaId}
            value={details}
            required
            maxLength={5000}
            rows={6}
            aria-describedby={contextId}
            placeholder={copy.placeholder}
            className="w-full resize-y rounded border border-border bg-transparent px-3 py-2 text-text outline-none placeholder:text-text-muted focus-visible:border-accent"
            onChange={(event) => setDetails(event.target.value)}
          />
          <p id={contextId} className="text-text-muted text-xs">
            We&apos;ll include your account, app version, current view, and
            session details so we can follow up and troubleshoot.
          </p>
        </div>

        <OverlayPanelActions>
          <OverlayPanelActionButton
            disabled={isSubmitting}
            onClick={handleDismiss}
          >
            Cancel
          </OverlayPanelActionButton>
          <OverlayPanelActionButton
            type="submit"
            variant="primary"
            disabled={!details.trim() || isSubmitting}
          >
            {isSubmitting ? "Sending…" : copy.submitLabel}
          </OverlayPanelActionButton>
        </OverlayPanelActions>
      </form>
    </OverlayPanel>
  );
}
