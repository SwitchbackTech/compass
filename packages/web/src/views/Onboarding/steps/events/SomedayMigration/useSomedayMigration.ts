import { useCallback, useState } from "react";
import { colorByPriority } from "@web/common/styles/theme.util";

// Types
export interface SomedayEvent {
  text: string;
  color: string;
}

// Constants
const colors = [
  colorByPriority.work,
  colorByPriority.self,
  colorByPriority.relationships,
];

// Custom hook for managing someday event migration
export const useSomedayMigration = () => {
  // State for the 3 sample someday events
  const [somedayEvents] = useState<SomedayEvent[]>([
    { text: "🥙 Meal prep", color: colorByPriority.work },
    { text: "🥗 Get groceries", color: colorByPriority.self },
    { text: "🏠 Book Airbnb", color: colorByPriority.relationships },
  ]);

  // Handle event click - logs to console as requested
  const handleEventClick = useCallback(
    (eventText: string, eventIndex: number, direction: "back" | "forward") => {
      const actionText = direction === "back" ? "previous" : "next";
      console.log(`Event migrated: "${eventText}" to ${actionText} week`);
      console.log(`Direction: ${direction}, Event index: ${eventIndex}`);
    },
    [],
  );

  return {
    somedayEvents,
    handleEventClick,
  };
};
