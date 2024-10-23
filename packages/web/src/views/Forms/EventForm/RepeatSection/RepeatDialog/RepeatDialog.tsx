import React, { FC } from "react";
import Select from "react-select";
import { Schema_Event } from "@core/types/event.types";
import { Recurrence_Selection } from "@web/common/types/web.event.types";
import {
  getRecurrenceOption,
  getRecurrenceRule,
} from "@web/common/utils/web.date.util";
import { RepeatIcon } from "@web/components/Icons/Repeat";

import {
  StyledRepeatRow,
  StyledRepeatText,
  StyledRepeatTextContainer,
} from "../styled";

interface Props {
  bgColor: string;
  recurrence: Schema_Event["recurrence"];
  onChangeRecurrence: (rule: string[] | null) => void;
  setIsRepeat: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RepeatDialog: FC<Props> = ({
  bgColor,
  recurrence,
  onChangeRecurrence,
  setIsRepeat,
}) => {
  const options = [
    { value: Recurrence_Selection.WEEK, label: "week" },
    { value: Recurrence_Selection.MONTH, label: "month" },
  ];

  const defaultValue =
    recurrence?.rule?.length > 0
      ? getRecurrenceOption(recurrence.rule[0])
      : options[0];

  const fontSize = "13px";

  const onRepeatTextClick = () => {
    onChangeRecurrence(null);
    setIsRepeat(false);
  };

  return (
    <StyledRepeatRow>
      <StyledRepeatTextContainer onClick={onRepeatTextClick}>
        <RepeatIcon />
        <StyledRepeatText hasRepeat={true}>Repeats every</StyledRepeatText>
      </StyledRepeatTextContainer>

      <div>
        <Select
          defaultValue={defaultValue}
          isOptionDisabled={(selection) =>
            ![Recurrence_Selection.WEEK, Recurrence_Selection.MONTH].includes(
              selection.value as Recurrence_Selection
            )
          }
          options={options}
          onChange={(selection) => {
            const rrule = getRecurrenceRule(
              selection.value as Recurrence_Selection
            );
            onChangeRecurrence(rrule);
          }}
          styles={{
            //TODO start here
            control: (baseStyles, state) => ({
              ...baseStyles,
              backgroundColor: bgColor,
              borderColor: state.isFocused ? "pink" : "purple",
              fontSize,
              minHeight: "30px",
              height: "30px",
            }),
            indicatorSeparator: () => ({
              visibility: "hidden",
            }),
            menuList: (baseStyles) => ({
              ...baseStyles,
              backgroundColor: bgColor,
              fontSize,
            }),
            option: (baseStyles, state) => ({
              ...baseStyles,
              color: state.isDisabled ? "#505050" : "black",
            }),
          }}
        />
      </div>
    </StyledRepeatRow>
  );
};
