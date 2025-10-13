import { useFeatureFlagEnabled } from "posthog-js/react";
import React from "react";
import { StyledTodayButton } from "./styled";

export const TodayButton = () => {
  const isPlannerEnabled = useFeatureFlagEnabled("experiment_planner");

  isPlannerEnabled && console.log("planner enabled");

  return <StyledTodayButton title="Today">Today</StyledTodayButton>;
};
