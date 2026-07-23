import { type FC, useCallback, useState } from "react";
import {
  DemoEventsBanner,
  dismissDemoEventsBanner,
  hasDismissedDemoEventsBanner,
} from "@web/components/DemoEventsBanner/DemoEventsBanner";
import { useDemoEventsPresent } from "@web/events/hooks/useDemoEventsPresent";

export const DemoEventsBannerGate: FC = () => {
  const hasDemoEvents = useDemoEventsPresent();
  const [dismissed, setDismissed] = useState(hasDismissedDemoEventsBanner);

  const handleDismiss = useCallback(() => {
    dismissDemoEventsBanner();
    setDismissed(true);
  }, []);

  if (!hasDemoEvents || dismissed) {
    return null;
  }

  return <DemoEventsBanner onDismiss={handleDismiss} />;
};
