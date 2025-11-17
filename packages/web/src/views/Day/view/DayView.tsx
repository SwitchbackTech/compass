import { Outlet } from "react-router-dom";
import { DateNavigationProvider } from "@web/views/Day/context/DateNavigationProvider";
import { StorageInfoModalProvider } from "@web/views/Day/context/StorageInfoModalContext";
import { TaskProvider } from "@web/views/Day/context/TaskProvider";

export function DayView() {
  return (
    <DateNavigationProvider>
      <StorageInfoModalProvider>
        <TaskProvider>
          <Outlet />
        </TaskProvider>
      </StorageInfoModalProvider>
    </DateNavigationProvider>
  );
}
