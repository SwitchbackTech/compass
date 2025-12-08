import React from "react";
import { useSetupKeyboardEvents } from "@web/common/hooks/useKeyboardEvent";
import { useSetupMovementEvents } from "@web/common/hooks/useMovementEvent";
import {
  CompassOptionalProviders,
  CompassRequiredProviders,
} from "@web/components/CompassProvider/CompassProvider";
import { CompassRouterProvider } from "@web/routers";

export const App = () => {
  useSetupKeyboardEvents();
  useSetupMovementEvents();

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
