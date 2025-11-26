import { FC } from "react";
import { AlignItems } from "@web/components/Flex/styled";
import { SelectView } from "@web/components/SelectView/SelectView";
import { Reminder } from "@web/views/Calendar/components/Header/Reminder/Reminder";
import {
  StyledHeaderRow,
  StyledLeftGroup,
} from "@web/views/Calendar/components/Header/styled";
import { useNowActions } from "@web/views/Now/hooks/useNowActions";

export const NowHeader: FC = () => {
  const { reminderRef } = useNowActions();

  return (
    <StyledHeaderRow alignItems={AlignItems.BASELINE}>
      <StyledLeftGroup />

      <Reminder ref={reminderRef} />

      <SelectView />
    </StyledHeaderRow>
  );
};
