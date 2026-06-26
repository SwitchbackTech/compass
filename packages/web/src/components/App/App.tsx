import React from "react";
import { useEventDragCursor } from "@web/common/calendar-interaction/dom/cursor/useEventDragCursor";
import { useSetupMovementEvents } from "@web/common/hooks/useMovementEvent";
import {
  CompassOptionalProviders,
  CompassRequiredProviders,
} from "@web/components/CompassProvider/CompassProvider";
import { CompassRouterProvider } from "@web/routers";

export const App = () => {
  useSetupMovementEvents();
  useEventDragCursor();

  return (
    <React.StrictMode>
      <CompassOptionalProviders>
        <CompassRequiredProviders>
          <CompassRouterProvider />
        </CompassRequiredProviders>
      </CompassOptionalProviders>
    </React.StrictMode>
  );
};
