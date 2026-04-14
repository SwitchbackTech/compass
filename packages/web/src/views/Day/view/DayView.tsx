import { Outlet } from "react-router-dom";
import { DateNavigationProvider } from "@web/views/Day/context/DateNavigationContext";
import { TaskProvider } from "@web/views/Day/context/TaskContext";

export function DayView() {
  return (
    <DateNavigationProvider>
      <TaskProvider>
        <Outlet />
      </TaskProvider>
    </DateNavigationProvider>
  );
}
