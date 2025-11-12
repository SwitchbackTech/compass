import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFeatureFlags } from "@web/common/hooks/useFeatureFlags";
import { DateNavigationProvider } from "@web/views/Day/context/DateNavigationProvider";
import { TaskProvider } from "@web/views/Day/context/TaskProvider";
import {
  formatDateForUrl,
  getValidDateFromUrl,
} from "@web/views/Day/util/date-route.util";
import { DayViewContent } from "@web/views/Day/view/DayViewContent";
import { FeatureFlagInActive } from "../../../components/FeatureFlag/FeatureFlagInActive";

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
  }

  // return (
  //   <DateNavigationProvider initialDate={validDate}>
  //     <TaskProvider>
  //       <DayViewContent />
  //     </TaskProvider>
  //   </DateNavigationProvider>
  // );

  return <FeatureFlagInActive />;
}
