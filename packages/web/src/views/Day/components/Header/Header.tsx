import { type FC, useCallback, useRef } from "react";
import { theme } from "@web/common/styles/theme";
import { HeaderInfoIcon } from "@web/components/HeaderInfoIcon/HeaderInfoIcon";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { Reminder } from "@web/views/Week/components/Header/Reminder/Reminder";
import { useReminderHotkey } from "@web/views/Week/hooks/shortcuts/useFocusHotkey";

interface Props {
  showReminder?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: FC<Props> = ({
  showReminder = false,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const reminderRef = useRef<HTMLDivElement>(null);

  const handleFocusReminder = useCallback(() => {
    if (showReminder) {
      reminderRef.current?.focus();
    }
  }, [showReminder]);

  useReminderHotkey(handleFocusReminder, [handleFocusReminder], showReminder);

  return (
    <div className="relative flex h-20 w-full items-baseline justify-between text-text-light">
      {!isSidebarOpen ? (
        <TooltipWrapper
          description="Open sidebar"
          onClick={onToggleSidebar}
          shortcut="["
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <SidebarIcon color={theme.color.text.lightInactive} size={21} />
          </span>
        </TooltipWrapper>
      ) : null}
      <div className="z-2 flex items-center justify-between" />

      {showReminder && <Reminder ref={reminderRef} />}

      <div className="z-2 flex h-full items-center justify-between pr-5">
        <HeaderInfoIcon />
        <SelectView />
      </div>
    </div>
  );
};
