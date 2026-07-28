import { BellIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { UserApi } from "@web/api/user.api";
import { useSession } from "@web/auth/compass/session/useSession";
import { SUBSCRIBE_TO_UPDATES_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

/**
 * Returns the actionable email-updates opt-in command when the user is
 * eligible. Kit remains the source of truth; this hook caches one lookup per
 * mount and retries a failed lookup when the palette next opens. Non-actionable
 * statuses (subscribed, unsubscribed, checking, error) yield no items.
 */
export const useSubscribeCmdItems = (open: boolean): CommandItem[] => {
  const { authenticated } = useSession();
  const [status, setStatus] = useState<
    | "idle"
    | "checking"
    | "unavailable"
    | "not_subscribed"
    | "subscribed"
    | "unsubscribed"
    | "error"
  >("idle");
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!authenticated) {
      hasChecked.current = false;
      setStatus("idle");
      return;
    }

    if (!open || hasChecked.current) return;

    hasChecked.current = true;
    setStatus("checking");
    const getEmailUpdates = UserApi.getEmailUpdates;

    if (!getEmailUpdates) {
      setStatus("unavailable");
      return;
    }

    void getEmailUpdates()
      .then((response) => setStatus(response.status))
      .catch(() => {
        hasChecked.current = false;
        setStatus("error");
      });
  }, [authenticated, open]);

  if (!authenticated || status !== "not_subscribed") return [];

  return [
    {
      id: "subscribe-to-updates",
      label: "Opt in to email updates",
      icon: BellIcon,
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
