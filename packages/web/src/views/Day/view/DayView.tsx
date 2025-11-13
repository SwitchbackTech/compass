import { useNavigate } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { useFeatureFlags } from "@web/common/hooks/useFeatureFlags";
import { DateNavigationProvider } from "../context/DateNavigationProvider";
import { TaskProvider } from "../context/TaskProvider";
import { DayViewContent } from "./DayViewContent";

export function DayView() {
  const { isPlannerEnabled } = useFeatureFlags();
  const navigate = useNavigate();

  // Initialize with today's date - get today's date at midnight in user's timezone, then convert to UTC
  const todayUTC = dayjs().startOf("day").utc();

  if (isPlannerEnabled) {
    return (
      <DateNavigationProvider initialDate={todayUTC}>
        <TaskProvider>
          <DayViewContent />
        </TaskProvider>
      </DateNavigationProvider>
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
        <button
          onClick={() => navigate("/")}
          className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
        >
          Return to Calendar
        </button>
      </div>
    );
  }
}
