import clsx from "clsx";
import { FC } from "react";
import { AuthView } from "../hooks/useAuthModal";

interface AuthTabsProps {
  /** Currently active tab */
  activeTab: AuthView;
  /** Callback when tab is clicked */
  onTabChange: (tab: AuthView) => void;
}

/**
 * Tab navigation for switching between Sign In and Sign Up views
 *
 * Uses accessible button pattern with aria-selected
 */
export const AuthTabs: FC<AuthTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: AuthView; label: string }[] = [
    { id: "signIn", label: "Sign In" },
    { id: "signUp", label: "Sign Up" },
  ];

  return (
    <div className="flex w-full gap-1" role="tablist" aria-label="Auth options">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              {
                "bg-accent-primary text-white": isActive,
                "text-text-light hover:bg-bg-secondary": !isActive,
              },
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
