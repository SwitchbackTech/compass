import { useCallback, useState } from "react";
import { colorByPriority } from "@web/common/styles/theme.util";

// Types
export interface SomedayEvent {
  text: string;
  color: string;
}

// Constants - Different events for each week
const thisWeekEvents: SomedayEvent[] = [
  { text: "🥙 Meal prep", color: colorByPriority.work },
  { text: "🥗 Get groceries", color: colorByPriority.self },
  { text: "🏠 Book Airbnb", color: colorByPriority.relationships },
];

const nextWeekEvents: SomedayEvent[] = [
  { text: "📧 Respond to emails", color: colorByPriority.work },
  { text: "🏃‍♂️ Go for a run", color: colorByPriority.self },
];

// Custom hook for managing someday event migration
export const useSomedayMigration = () => {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0); // 0 = this week, 1 = next week

  // Get events based on current week
  const somedayEvents =
    currentWeekIndex === 0 ? thisWeekEvents : nextWeekEvents;

  // Get current week label
  const weekLabel = currentWeekIndex === 0 ? "This Week" : "Next Week";

  // Navigation functions
  const canNavigateBack = currentWeekIndex > 0;
  const canNavigateForward = currentWeekIndex < 1;

  const navigateToNextWeek = useCallback(() => {
    if (canNavigateForward) {
      setCurrentWeekIndex(1);
      console.log("Navigated to next week");
    }
  }, [canNavigateForward]);

  const navigateToPreviousWeek = useCallback(() => {
    if (canNavigateBack) {
      setCurrentWeekIndex(0);
      console.log("Navigated to previous week");
    }
  }, [canNavigateBack]);

  // Handle event click - logs to console as requested
  const handleEventClick = useCallback(
    (eventText: string, eventIndex: number, direction: "back" | "forward") => {
      const actionText = direction === "back" ? "previous" : "next";
      const currentWeek = currentWeekIndex === 0 ? "this week" : "next week";
      console.log(
        `Event migrated: "${eventText}" from ${currentWeek} to ${actionText} week`,
      );
      console.log(`Direction: ${direction}, Event index: ${eventIndex}`);
    },
    [currentWeekIndex],
  );

  return {
    somedayEvents,
    weekLabel,
    currentWeekIndex,
    canNavigateBack,
    canNavigateForward,
    navigateToNextWeek,
    navigateToPreviousWeek,
    handleEventClick,
  };
};
