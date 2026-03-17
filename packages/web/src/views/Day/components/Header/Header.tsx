import { type FC, useCallback, useRef } from "react";
import { theme } from "@web/common/styles/theme";
import { AccountIcon } from "@web/components/AuthModal/AccountIcon";
import { AlignItems } from "@web/components/Flex/styled";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { Reminder } from "@web/views/Calendar/components/Header/Reminder/Reminder";
import {
  StyledHeaderRow,
  StyledLeftGroup,
} from "@web/views/Calendar/components/Header/styled";
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
    <StyledHeaderRow alignItems={AlignItems.BASELINE}>
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
      <StyledLeftGroup />

      {showReminder && <Reminder ref={reminderRef} />}

      <AccountIcon />
      <SelectView />
    </StyledHeaderRow>
  );
};
