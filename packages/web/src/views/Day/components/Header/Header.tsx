import { FC, useRef } from "react";
import { AlignItems } from "@web/components/Flex/styled";
import { SelectView } from "@web/components/SelectView/SelectView";
import { Reminder } from "@web/views/Calendar/components/Header/Reminder/Reminder";
import {
  StyledHeaderRow,
  StyledLeftGroup,
} from "@web/views/Calendar/components/Header/styled";
import { useReminderHotkey } from "@web/views/Calendar/hooks/shortcuts/useFocusHotkey";

export const Header: FC = () => {
  const reminderRef = useRef<HTMLDivElement>(null);

  useReminderHotkey(() => reminderRef.current?.focus(), [reminderRef]);

  return (
    <>
      <StyledHeaderRow alignItems={AlignItems.BASELINE}>
        <StyledLeftGroup />

        <Reminder ref={reminderRef} />

        <SelectView />
      </StyledHeaderRow>
    </>
  );
};
