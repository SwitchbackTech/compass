interface ClassNames {
  [className: string]: string;
}
declare const classNames: ClassNames;
declare module "*.scss" {
  export = classNames;
}

declare module "*.css" {
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
  /** Semantic user-metadata bridge for e2e tests. Set by packages/web/src/auth/state/user-metadata.store.ts. */
  __COMPASS_E2E_STORE__?: {
    userMetadata: {
      getState: () => import("@web/auth/state/user-metadata.store").UserMetadataState;
      set: (metadata: import("@core/types/user.types").UserMetadata) => void;
      setLoading: () => void;
      clear: () => void;
    };
  };
  /** Session test hooks exposed by SessionProvider for e2e auth control. */
  __COMPASS_E2E_HOOKS__?: {
    setAuthenticated: (value: boolean) => void;
  };
}
