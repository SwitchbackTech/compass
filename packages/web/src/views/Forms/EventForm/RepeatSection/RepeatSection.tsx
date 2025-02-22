import React, { FC, useState } from "react";
import { RRULE } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { SetEventFormField } from "../types";
import { RepeatDialog } from "./RepeatDialog";
import { StyledRepeatContainer, StyledRepeatText } from "./styled";

interface Props {
  bgColor: string;
  onSetEventField: SetEventFormField;
  recurrence: Schema_Event["recurrence"];
}

export const RepeatSection: FC<Props> = ({
  bgColor,
  onSetEventField,
  recurrence,
}) => {
  const [isRepeat, setIsRepeat] = useState(recurrence?.rule?.length > 0);

  const toggleRecurrence = () => {
    if (isRepeat) {
      onSetEventField("recurrence", null);
      setIsRepeat(false);
    } else {
      onSetEventField("recurrence", { ...recurrence, rule: [RRULE.WEEK] });
      setIsRepeat(true);
    }
  };

  return (
    <StyledRepeatContainer>
      {isRepeat ? (
        <RepeatDialog
          bgColor={bgColor}
          onChangeRecurrence={(rule) => {
            if (rule === null) {
              onSetEventField("recurrence", { ...recurrence, rule: null });
            } else {
              onSetEventField("recurrence", { ...recurrence, rule });
            }
          }}
          recurrence={recurrence}
          setIsRepeat={setIsRepeat}
        />
      ) : (
        <StyledRepeatText
          hasRepeat={false}
          onClick={toggleRecurrence}
          tabIndex={0}
        >
          Does not repeat
        </StyledRepeatText>
      )}
    </StyledRepeatContainer>
  );
};
