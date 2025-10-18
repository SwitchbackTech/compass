import { useContext } from "react";
import dayjs from "@core/util/date/dayjs";
import { TaskContext } from "../context/TaskProvider";

export function useDateInView(): dayjs.Dayjs {
  try {
    const context = useContext(TaskContext);
    if (!context) {
      // Fallback to today's date for testing or when not in TaskProvider
      return dayjs();
    }
    return context.dateInView;
  } catch (error) {
    // Fallback to today's date for testing or when not in TaskProvider
    return dayjs();
  }
}
