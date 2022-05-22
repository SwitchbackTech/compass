import { useState } from "react";

export const usePreferences = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);

  return { isSidebarOpen, toggleSidebar };
};

export type Preferences = ReturnType<typeof usePreferences>;
