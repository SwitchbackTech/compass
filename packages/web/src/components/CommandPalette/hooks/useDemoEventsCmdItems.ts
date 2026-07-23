import { EraserIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { clearDemoEvents, hasDemoEvents } from "@web/events/demo-events.util";
import { dismissDemoEventsBanner } from "@web/components/DemoEventsBanner/DemoEventsBanner";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { type CommandItem } from "../command-palette.types";

const CLEAR_DEMO_EVENTS_TOAST_ID = "clear-demo-events";

export function useDemoEventsCmdItems(): CommandItem[] {
  const queryClient = useQueryClient();
  const [demoEventsPresent, setDemoEventsPresent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void hasDemoEvents().then((present) => {
      if (!cancelled) {
        setDemoEventsPresent(present);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClearDemoEvents = useCallback(async () => {
    const removedCount = await clearDemoEvents(queryClient);
    dismissDemoEventsBanner();
    setDemoEventsPresent(false);

    if (removedCount > 0) {
      showStatusToast(
        CLEAR_DEMO_EVENTS_TOAST_ID,
        removedCount === 1
          ? "Removed 1 sample event"
          : `Removed ${removedCount} sample events`,
      );
    }
  }, [queryClient]);

  if (!demoEventsPresent) {
    return [];
  }

  return [
    {
      id: "clear-sample-events",
      label: "Clear sample events",
      icon: EraserIcon,
      onClick: () => {
        void handleClearDemoEvents();
      },
    },
  ];
}
