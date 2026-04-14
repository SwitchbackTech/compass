import { DateNavigationProvider } from "@web/views/Day/context/DateNavigationContext";
import { TaskProvider } from "@web/views/Day/context/TaskContext";
import { Outlet } from "react-router-dom";

export function DayView() {
  return (
    <DateNavigationProvider>
      <TaskProvider>
        <Outlet />
      </TaskProvider>
    </DateNavigationProvider>
  );
}
