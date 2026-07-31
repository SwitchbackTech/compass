import { createElement, Fragment, type PropsWithChildren } from "react";

// posthog-js/react performs real network I/O as a load-time side effect of
// being required, independent of whether <PostHogProvider> ever renders (the
// app already gates rendering on isPosthogEnabled()). In a `bun test`
// process that XHR can fire asynchronously after the importing test
// finishes, landing inside SuperTokens' XMLHttpRequest interceptor mid-way
// through an unrelated later file and crashing it. Skip the real SDK there.
const posthogReact = process.env.BUN_TEST_RUN
  ? ({
      PostHogProvider: ({ children }: PropsWithChildren) =>
        createElement(Fragment, null, children),
      // The real usePostHog is typed as always returning PostHog (it isn't,
      // context can default to undefined), so match that declared shape here
      // rather than infer a wider, more "honest" union.
      usePostHog: () => undefined,
    } as unknown as typeof import("posthog-js/react"))
  : (require("posthog-js/react") as typeof import("posthog-js/react"));

export const PostHogProvider = posthogReact.PostHogProvider;
export const usePostHog = posthogReact.usePostHog;
