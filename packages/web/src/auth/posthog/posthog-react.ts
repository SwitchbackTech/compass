import { createRequire } from "node:module";

const require = createRequire(import.meta.path);
const posthogReact = require("posthog-js/react") as typeof import("posthog-js/react");

export const PostHogProvider = posthogReact.PostHogProvider;
export const usePostHog = posthogReact.usePostHog;
