import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFeatureFlags } from "@web/common/hooks/useFeatureFlags";
import { DateNavigationProvider } from "../context/DateNavigationProvider";
import { TaskProvider } from "../context/TaskProvider";
import { formatDateForUrl, getValidDateFromUrl } from "../util/date-route.util";
import { DayViewContent } from "./DayViewContent";

export function DayView() {
  const { isPlannerEnabled } = useFeatureFlags();
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();

  // Get the valid date from URL parameter
  const validDate = getValidDateFromUrl(date);

  // Redirect if the date was corrected (invalid date in URL)
  useEffect(() => {
    if (date && validDate.format("YYYY-MM-DD") !== date) {
      const correctedUrl = `/day/${formatDateForUrl(validDate)}`;
      navigate(correctedUrl, { replace: true });
    }
  }, [date, validDate, navigate]);

  if (isPlannerEnabled) {
    return (
      <DateNavigationProvider initialDate={validDate}>
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
      </div>
    );
  }
}
