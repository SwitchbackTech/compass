import { useState } from "react";

export const usePreferences = () => {
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isMonthWidgetOpen, setIsMonthWidgetOpen] = useState(false);

  const toggleMonthWidget = () => {
    setIsMonthWidgetOpen((open) => !open);
  };

  const toggleSidebar = (target: "left") => {
    if (target === "left") {
      setIsLeftSidebarOpen((open) => !open);
    }
  };

  return {
    isLeftSidebarOpen,
    isMonthWidgetOpen,
    toggleMonthWidget,
    toggleSidebar,
  };
};

export type Preferences = ReturnType<typeof usePreferences>;
