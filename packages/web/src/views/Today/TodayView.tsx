import { useFeatureFlagEnabled } from "posthog-js/react";
import React from "react";
import { TodayViewContent } from "./TodayViewContent";
import { TaskProvider } from "./context/TaskProvider";

export function TodayView() {
  const isPlannerEnabled = useFeatureFlagEnabled("experiment_planner");

  return (
    <TaskProvider>
      {!isPlannerEnabled && (
        <div className="bg-orange/20 border-b border-orange/30 px-4 py-2 text-white-100 text-sm">
          <strong>Experimental Feature:</strong> This feature is currently in
          beta. Ask the admin to enable the "experiment_planner" feature flag in
          PostHog to dismiss this warning.
        </div>
      )}
      <TodayViewContent />
    </TaskProvider>
  );
}
