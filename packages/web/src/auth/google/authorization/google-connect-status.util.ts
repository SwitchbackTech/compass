import { track } from "@web/auth/posthog/track";
import {
  GOOGLE_CONNECT_FAILED_TOAST_ID,
  getToastDefaultOptions,
} from "@web/common/constants/toast.constants";
import { getToast } from "@web/common/utils/toast/toast.port";

// Mirrors the `status` values sync/server/connection.routes.ts's
// redirectAfterConnect can send: "connected" on a successful link, "declined"
// when the user canceled or Google returned an error on its consent screen,
// "missingScopes" when Google granted a subset of scopes that leaves out
// calendar access (the box was unchecked), "error" for everything else
// (expired OAuth state, a failed code exchange, a failed link). Anything else
// in the URL (a stray/foreign value, or the params simply absent) is not a
// connect redirect at all.
export type GoogleConnectStatus =
  | "connected"
  | "declined"
  | "missingScopes"
  | "error";

const CONNECT_DECLINED_TOAST_ID = "google-connect-declined";
const CONNECT_SUCCESS_TOAST_ID = "google-connect-success";
const CONNECT_MISSING_SCOPES_TOAST_ID = "google-connect-missing-scopes";

const STATUS_VALUES: readonly GoogleConnectStatus[] = [
  "connected",
  "declined",
  "missingScopes",
  "error",
];

// Read the post-connect redirect params BEFORE the router mounts: the root
// route's search validation strips unrecognized params (including these) on
// the first navigation, so this has to run at bootstrap or the signal is
// gone.
export function readGoogleConnectStatus(
  search = window.location.search,
): GoogleConnectStatus | null {
  const params = new URLSearchParams(search);
  if (params.get("provider") !== "google") return null;
  const status = params.get("status");
  return (STATUS_VALUES as readonly string[]).includes(status ?? "")
    ? (status as GoogleConnectStatus)
    : null;
}

// Every non-success outcome of the add-account/reconnect OAuth round-trip
// used to be a silent dead end: the user cancels on Google's consent screen,
// or the OAuth state expires, or linking fails, and lands back on an
// unchanged calendar with no feedback at all - the button they clicked looks
// like it did nothing. Called once at bootstrap, immediately after
// `root.render` - deferred a frame (like showDbInitErrorToast) so the
// ToastContainer has mounted before the toast fires.
export function showGoogleConnectStatusToast(
  status: GoogleConnectStatus,
): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => fireGoogleConnectStatusToast(status));
  });
}

function fireGoogleConnectStatusToast(status: GoogleConnectStatus): void {
  const toast = getToast();
  switch (status) {
    case "connected":
      track("calendar_connected");
      toast.success("Google Calendar connected.", {
        ...getToastDefaultOptions(),
        toastId: CONNECT_SUCCESS_TOAST_ID,
      });
      return;
    case "declined":
      toast.info(
        "No problem - nothing was connected. You can add the account anytime from Settings.",
        { ...getToastDefaultOptions(), toastId: CONNECT_DECLINED_TOAST_ID },
      );
      return;
    case "missingScopes":
      toast.error(
        "Compass needs calendar permission to sync. Reconnect from Settings and leave the calendar box checked.",
        {
          ...getToastDefaultOptions(),
          autoClose: false,
          toastId: CONNECT_MISSING_SCOPES_TOAST_ID,
        },
      );
      return;
    case "error":
      toast.error(
        "We couldn't connect your Google account. Please try again from Settings.",
        {
          ...getToastDefaultOptions(),
          autoClose: false,
          toastId: GOOGLE_CONNECT_FAILED_TOAST_ID,
        },
      );
      return;
  }
}
