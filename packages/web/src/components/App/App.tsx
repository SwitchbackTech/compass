import React from "react";
import {
  CompassOptionalProviders,
  CompassRequiredProviders,
} from "@web/components/CompassProvider/CompassProvider";
import { CompassRouterProvider } from "@web/routers";

export const App = () => {
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
