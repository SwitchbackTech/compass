import { useFeatureFlagEnabled } from "posthog-js/react";

export const useFeatureFlags = () => {
  const isPlannerEnabled = useFeatureFlagEnabled("experiment_planner");

  return { isPlannerEnabled };
};
