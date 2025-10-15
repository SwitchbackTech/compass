import React from "react";
import { useFeatureFlags } from "@web/common/hooks/useFeatureFlags";
import { TaskProvider } from "../context/TaskProvider";
import { TodayViewContent } from "./TodayViewContent";

export function TodayView() {
  const { isPlannerEnabled } = useFeatureFlags();
  if (isPlannerEnabled) {
    return (
      <TaskProvider>
        <TodayViewContent />
      </TaskProvider>
    );
  } else {
    return (
      <div className="bg-orange/20 border-orange/30 border-b px-4 py-2 text-sm text-white">
        <p>
          <strong>Experimental Feature:</strong> This feature is currently in
          beta. Click the flask icon and toggle the "experiment_planner" feature
          flag to try it out.
        </p>
        <p>
          If you do not see the toggle icon after clicking the flask icon, ask
          Tyler to add you to the list of beta users.
        </p>
        <p>
          If nothing happens when you click the flask icon, refresh the page and
          retry.
        </p>
      </div>
    );
  }
}
