interface ClassNames {
  [className: string]: string;
}
declare const classNames: ClassNames;
declare module "*.scss" {
  export = classNames;
}

declare const imageUrl: string;
declare module "*.png" {
  export = imageUrl;
}

declare module "*.svg" {
  import type * as React from "react";

  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

  export default ReactComponent;
}

declare module "*.jpg" {
  export = imageUrl;
}

declare module "*.jpeg" {
  export = imageUrl;
}

declare const BUILD_VERSION: string;

/** Compass e2e globals — set by the app when __COMPASS_E2E_TEST__ is true. */
interface Window {
  /** Set by Playwright prepareOAuthTestPage; disables SuperTokens session checks in e2e mode. */
  __COMPASS_E2E_TEST__?: boolean;
  /** Redux store exposed for test action dispatch. Set by packages/web/src/store/index.ts. */
  __COMPASS_E2E_STORE__?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch: (action: any) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getState: () => any;
  };
  /** Session test hooks exposed by SessionProvider for e2e auth control. */
  __COMPASS_E2E_HOOKS__?: {
    setAuthenticated: (value: boolean) => void;
  };
}
