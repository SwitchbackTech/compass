import React, { FC } from "react";
import Select, { StylesConfig } from "react-select";
import { Schema_Event } from "@core/types/event.types";
import { brighten, darken } from "@core/util/color.utils";
import { Recurrence_Selection } from "@web/common/types/web.event.types";
import {
  getRecurrenceOption,
  getRecurrenceRule,
} from "@web/common/utils/web.date.util";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { theme } from "@web/common/styles/theme";

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

  const onRepeatTextClick = () => {
    onChangeRecurrence(null);
    setIsRepeat(false);
  };

  const fontSize = theme.text.default;
  const bgBright = brighten(bgColor);
  const bgDark = darken(bgColor);

  const selectStyles: StylesConfig = {
    control: (baseStyles) => ({
      ...baseStyles,
      backgroundColor: bgColor,
      borderRadius: 4,
      fontSize,
      height: "27px",
    }),
    indicatorSeparator: () => ({
      visibility: "hidden",
    }),
    menuList: (baseStyles) => ({
      ...baseStyles,
      fontSize,
      backgroundColor: bgColor,
    }),
    option: (styles, { isDisabled, isFocused, isSelected }) => {
      return {
        ...styles,
        backgroundColor: isDisabled
          ? undefined
          : isSelected
          ? bgBright
          : isFocused
          ? bgDark
          : undefined,
        color: isDisabled
          ? theme.color.text.lightInactive
          : theme.color.text.dark,
        cursor: isDisabled ? "not-allowed" : "default",

        ":active": {
          ...styles[":active"],
          backgroundColor: !isDisabled
            ? isSelected
              ? bgColor
              : bgBright
            : undefined,
        },
      };
    },
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
          isOptionDisabled={(selection: { value: string; label: string }) =>
            ![Recurrence_Selection.WEEK, Recurrence_Selection.MONTH].includes(
              selection.value as Recurrence_Selection
            )
          }
          options={options}
          onChange={(selection: { value: string; label: string }) => {
            const rrule = getRecurrenceRule(
              selection.value as Recurrence_Selection
            );
            onChangeRecurrence(rrule);
          }}
          theme={(theme) => ({
            ...theme,
            borderRadius: 4,
          })}
          styles={selectStyles}
        />
      </div>
    </StyledRepeatRow>
  );
};
