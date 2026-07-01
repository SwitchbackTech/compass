import React from "react";
import { useSetupMovementEvents } from "@web/common/pointer/useMovementEvent";
import {
  CompassOptionalProviders,
  CompassRequiredProviders,
} from "@web/components/CompassProvider/CompassProvider";
import { CompassRouterProvider } from "@web/routers";

export const App = () => {
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
