import {
  BellIcon,
  CircleNotchIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { UserApi } from "@web/api/user.api";
import { useSession } from "@web/auth/compass/session/useSession";
import { SUBSCRIBE_TO_UPDATES_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { type CommandItem } from "@web/components/CommandPalette/command-palette.types";

/**
 * Returns the email-updates command only when that integration is available.
 * Kit remains the source of truth; this hook caches one lookup per mount and
 * retries a failed lookup when the palette next opens.
 */
export const useSubscribeCmdItems = (open: boolean): CommandItem[] => {
  const { authenticated } = useSession();
  const [status, setStatus] = useState<
    | "idle"
    | "checking"
    | "unavailable"
    | "not_subscribed"
    | "subscribed"
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

  if (!authenticated || status === "idle" || status === "unavailable")
    return [];

  if (status === "checking") {
    return [
      {
        id: "subscribe-to-updates",
        label: "Checking email update status…",
        icon: CircleNotchIcon,
        iconClassName: "animate-spin",
        disabled: true,
      },
    ];
  }

  if (status === "subscribed") {
    return [
      {
        id: "subscribe-to-updates",
        label: "You’re subscribed to updates",
        icon: BellIcon,
        disabled: true,
      },
    ];
  }

  if (status === "error") {
    return [
      {
        id: "subscribe-to-updates",
        label: "Couldn’t check email update status",
        icon: WarningCircleIcon,
        disabled: true,
      },
    ];
  }

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
