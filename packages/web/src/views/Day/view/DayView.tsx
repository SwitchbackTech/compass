import { Outlet } from "react-router-dom";
import { DayOnboardingOverlays } from "@web/views/Day/components/OnboardingOverlay/DayOnboardingOverlays";
import { DateNavigationProvider } from "@web/views/Day/context/DateNavigationContext";
import { StorageInfoModalProvider } from "@web/views/Day/context/StorageInfoModalContext";
import { TaskProvider } from "@web/views/Day/context/TaskContext";

export function DayView() {
  return (
    <DateNavigationProvider>
      <StorageInfoModalProvider>
        <TaskProvider>
          <DayOnboardingOverlays />
          <Outlet />
        </TaskProvider>
      </StorageInfoModalProvider>
    </DateNavigationProvider>
  );
}
