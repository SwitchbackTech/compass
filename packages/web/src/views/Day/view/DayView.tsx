import dayjs from "@core/util/date/dayjs";
import { DateNavigationProvider } from "../context/DateNavigationProvider";
import { StorageInfoModalProvider } from "../context/StorageInfoModalContext";
import { TaskProvider } from "../context/TaskProvider";
import { DayViewContent } from "./DayViewContent";

export function DayView() {
  // Initialize with today's date - get today's date at midnight in user's timezone, then convert to UTC
  const todayUTC = dayjs().startOf("day").utc();

  return (
    <DateNavigationProvider initialDate={todayUTC}>
      <StorageInfoModalProvider>
        <TaskProvider>
          <DayViewContent />
        </TaskProvider>
      </StorageInfoModalProvider>
    </DateNavigationProvider>
  );
}
