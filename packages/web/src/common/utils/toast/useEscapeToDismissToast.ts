import { getToast } from "@web/common/utils/toast/toast.port";
import { isEventFormOpen } from "@web/events/stores/draft.store";
import { isFloatingLayerOpen } from "@web/shortcuts/floating-layer";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

/**
 * Escape clears the visible toast so a notice never has to be waited out.
 * Lowest-priority Escape consumer by design: modals are excluded for free by
 * the app lock (no `ignoreAppLock` here), and the checks below stand this
 * handler down while the form or a floating layer owns Escape.
 *
 * Wart: `dismiss()` clears what is on screen but not react-toastify's waiting
 * queue (the container runs `limit={1}`), so a queued toast still gets its
 * turn. That is intended: it is a different message the user has not seen.
 */
export const useEscapeToDismissToast = () => {
  useAppShortcut(
    "Escape",
    () => {
      if (isEventFormOpen()) return;
      if (isFloatingLayerOpen()) return;

      getToast().dismiss();
    },
    { ignoreInputs: false },
  );
};
