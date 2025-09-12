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
export const useSomedayMigration = (
  onEventMigrated?: () => void,
  onEventMigratedForward?: (eventName: string) => void,
  onNavigatedToNextWeek?: () => void,
) => {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0); // 0 = this week, 1 = next week
  const [thisWeekEventsList, setThisWeekEventsList] =
    useState<SomedayEvent[]>(thisWeekEvents);
  const [nextWeekEventsList, setNextWeekEventsList] =
    useState<SomedayEvent[]>(nextWeekEvents);

  // Get events based on current week
  const somedayEvents =
    currentWeekIndex === 0 ? thisWeekEventsList : nextWeekEventsList;

  // Get current week label
  const weekLabel = currentWeekIndex === 0 ? "This Week" : "Next Week";

  // Navigation functions
  const canNavigateBack = currentWeekIndex > 0;
  const canNavigateForward = currentWeekIndex < 1;

  const navigateToNextWeek = useCallback(() => {
    if (canNavigateForward) {
      setCurrentWeekIndex(1);
      console.log("Navigated to next week");
      onNavigatedToNextWeek?.();
    }
  }, [canNavigateForward, onNavigatedToNextWeek]);

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

      // Actually move the event between lists
      if (direction === "forward" && currentWeekIndex === 0) {
        // Moving from This Week to Next Week
        const eventToMove = thisWeekEventsList[eventIndex];
        if (eventToMove) {
          setThisWeekEventsList((prev) =>
            prev.filter((_, index) => index !== eventIndex),
          );
          setNextWeekEventsList((prev) => [...prev, eventToMove]);
        }
      } else if (direction === "back" && currentWeekIndex === 1) {
        // Moving from Next Week back to This Week
        const eventToMove = nextWeekEventsList[eventIndex];
        if (eventToMove) {
          setNextWeekEventsList((prev) =>
            prev.filter((_, index) => index !== eventIndex),
          );
          setThisWeekEventsList((prev) => [...prev, eventToMove]);
        }
      }

      // Call the callback to mark that an event has been migrated
      onEventMigrated?.();

      // If migrating forward, call the specific forward migration callback
      if (direction === "forward") {
        onEventMigratedForward?.(eventText);
      }
    },
    [
      currentWeekIndex,
      onEventMigrated,
      onEventMigratedForward,
      thisWeekEventsList,
      nextWeekEventsList,
    ],
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
