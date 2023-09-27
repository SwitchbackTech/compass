import React, { FC } from "react";
import Select from "react-select";
import { ColorHex } from "@core/constants/colors";
import { Schema_Event } from "@core/types/event.types";
import { Recurrence_Selection } from "@web/common/types/web.event.types";
import {
  getRecurrenceOption,
  getRecurrenceRule,
} from "@web/common/utils/web.date.util";

import {
  StyledRepeatRow,
  StyledRepeatText,
  StyledSelectContainer,
} from "../styled";

interface Props {
  bgColor: ColorHex;
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
    { value: Recurrence_Selection.WEEKS_2, label: "2 weeks" },
    { value: Recurrence_Selection.WEEKS_3, label: "3 weeks" },
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
      <StyledRepeatText hasRepeat={true} onClick={onRepeatTextClick}>
        🔁 Repeats every
      </StyledRepeatText>

      <StyledSelectContainer>
        <Select
          defaultValue={defaultValue}
          isOptionDisabled={(opt) =>
            ![Recurrence_Selection.WEEK, Recurrence_Selection.MONTH].includes(
              opt.value
            )
          }
          options={options}
          onChange={(selection) => {
            const rrule = getRecurrenceRule(selection.value);
            onChangeRecurrence(rrule);
          }}
          styles={{
            control: (baseStyles, state) => ({
              ...baseStyles,
              backgroundColor: bgColor,
              borderColor: state.isFocused ? "grey" : "lightgrey",
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
      </StyledSelectContainer>
    </StyledRepeatRow>
  );
};
