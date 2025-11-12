import dayjs from "@core/util/date/dayjs";
import { useFeatureFlags } from "@web/common/hooks/useFeatureFlags";
import { DateNavigationProvider } from "@web/views/Day/context/DateNavigationProvider";
import { TaskProvider } from "@web/views/Day/context/TaskProvider";
import { NowViewContent } from "@web/views/Now/view/NowViewContent";

export const NowView = () => {
  const { isPlannerEnabled } = useFeatureFlags();

  if (isPlannerEnabled) {
    return (
      <DateNavigationProvider initialDate={dayjs()}>
        <TaskProvider>
          <NowViewContent />
        </TaskProvider>
      </DateNavigationProvider>
    );
  }

  return (
    <DateNavigationProvider initialDate={dayjs()}>
      <TaskProvider>
        <NowViewContent />
      </TaskProvider>
    </DateNavigationProvider>
  );

  // return <FeatureFlagInActive />;
};
