import { BellIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { type EmailUpdatesStatus } from "@core/types/email/email.types";
import { UserApi } from "@web/api/user.api";
import { useSession } from "@web/auth/compass/session/useSession";
import { SUBSCRIBE_TO_UPDATES_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

/**
 * Returns the email-updates opt-in command when Kit reports the user as
 * eligible. Caches one lookup per mount; retries a failed lookup the next
 * time the palette opens.
 */
export const useSubscribeCmdItems = (open: boolean): CommandItem[] => {
  const { authenticated } = useSession();
  const [status, setStatus] = useState<"idle" | EmailUpdatesStatus>("idle");
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!authenticated) {
      hasChecked.current = false;
      setStatus("idle");
      return;
    }

    if (!open || hasChecked.current) return;

    hasChecked.current = true;
    void UserApi.getEmailUpdates()
      .then((response) => setStatus(response.status))
      .catch(() => {
        hasChecked.current = false;
      });
  }, [authenticated, open]);

  if (!authenticated || status !== "not_subscribed") return [];

  return [
    {
      id: "subscribe-to-updates",
      label: "Opt in to email updates",
      icon: BellIcon,
      keywords: ["newsletter", "email", "updates"],
      onClick: () => {
        UserApi.subscribeToEmailUpdates()
          .then((response) => {
            if (response.status !== "subscribed") {
              throw new Error("Subscriber is not active");
            }
            setStatus("subscribed");
            showStatusToast(
              SUBSCRIBE_TO_UPDATES_TOAST_ID,
              "Subscribed to updates",
            );
          })
          .catch(() => {
            showErrorToast("Couldn't subscribe to updates. Please try again.", {
              toastId: SUBSCRIBE_TO_UPDATES_TOAST_ID,
            });
          });
      },
    },
  ];
};
