import { type FC, useCallback, useRef } from "react";
import { theme } from "@web/common/styles/theme";
import { HeaderInfoIcon } from "@web/components/HeaderInfoIcon/HeaderInfoIcon";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { Reminder } from "@web/views/Calendar/components/Header/Reminder/Reminder";
import { useReminderHotkey } from "@web/views/Calendar/hooks/shortcuts/useFocusHotkey";

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
    <div className="text-text-light relative flex h-20 w-full items-baseline justify-between">
      <TooltipWrapper
        description={isSidebarOpen ? "Hide shortcuts" : "Show shortcuts"}
        onClick={onToggleSidebar}
        shortcut="["
      >
        <SidebarIcon
          color={
            isSidebarOpen
              ? theme.color.text.light
              : theme.color.text.lightInactive
          }
        />
      </TooltipWrapper>
      <div className="z-2 flex items-center justify-between" />

      {showReminder && <Reminder ref={reminderRef} />}

      <div className="z-2 flex h-full items-center justify-between">
        <HeaderInfoIcon />
        <SelectView />
      </div>
    </div>
  );
};
