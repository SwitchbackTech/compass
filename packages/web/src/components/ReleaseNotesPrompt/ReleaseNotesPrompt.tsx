import { useState } from "react";
import { UserApi } from "@web/api/user.api";
import { MODAL_DISMISS_MS } from "@web/common/constants/motion.constants";
import { useDismissTransition } from "@web/common/hooks/useDismissTransition";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { releaseNotesPromptActions } from "@web/components/ReleaseNotesPrompt/release-notes-prompt.store";
import { PixelPirate } from "@web/components/WelcomeModal/PixelPirate";

type PromptState =
  | "asking"
  | "confirmed"
  | "declined"
  | "unavailable"
  | "unsubscribed";

export function ReleaseNotesPrompt() {
  const [state, setState] = useState<PromptState>("asking");
  const { closing, beginDismiss } = useDismissTransition(MODAL_DISMISS_MS);

  const dismiss = () => {
    beginDismiss(() => releaseNotesPromptActions.close());
  };

  const decline = () => {
    if (state === "unavailable" || state === "unsubscribed") {
      dismiss();
      return;
    }
    if (state !== "asking") return;
    setState("declined");
    window.setTimeout(dismiss, 1300);
  };

  const subscribe = async () => {
    if (state !== "asking") return;
    try {
      const response = await UserApi.subscribeToEmailUpdates();
      if (response.status === "unavailable") {
        setState("unavailable");
        return;
      }
      if (response.status === "unsubscribed") {
        setState("unsubscribed");
        return;
      }
      if (response.status !== "subscribed") {
        throw new Error("Subscriber is not active");
      }
      setState("confirmed");
      window.setTimeout(dismiss, 1300);
    } catch {
      showErrorToast("Couldn't subscribe to updates. Please try again.");
      dismiss();
    }
  };

  return (
    <OverlayPanel
      align="start"
      ariaLabel="Release notes subscription"
      backdropClassName="p-8"
      closing={closing}
      onDismiss={decline}
      widthClassName="w-120"
    >
      <div className="flex w-full flex-col gap-6">
        <PixelPirate className="h-14 w-14" />
        {state === "asking" ? (
          <>
            <div className="flex flex-col gap-2">
              <h2 className="font-bold text-2xl text-text leading-snug">
                Want the latest Compass news?
              </h2>
              <p className="text-text-muted">
                Get monthly product email. Unsubscribe anytime.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={decline}
                className="c-button c-button-secondary rounded-full px-5"
              >
                Nah, I don&apos;t want more emails
              </button>
              <button
                type="button"
                onClick={() => void subscribe()}
                className="c-button c-button-primary c-button-elevated rounded-full px-5"
              >
                Yes, keep me updated
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-2xl text-text leading-snug">
              {state === "confirmed"
                ? "You're in!"
                : state === "unavailable"
                  ? "Email updates aren't available here."
                  : state === "unsubscribed"
                    ? "You're unsubscribed from updates."
                    : "No problem."}
            </h2>
            <p className="text-text-muted">
              {state === "confirmed"
                ? "You'll get the next release notes in your inbox"
                : state === "unavailable"
                  ? "Ask this Compass instance's administrator to enable email updates."
                  : state === "unsubscribed"
                    ? "Kit requires a separate re-subscription before it can send updates again."
                    : "No problem, you can signup using the cmd palette if you change your mind."}
            </p>
            {(state === "unavailable" || state === "unsubscribed") && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={dismiss}
                  className="c-button c-button-primary rounded-full px-5"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </OverlayPanel>
  );
}
