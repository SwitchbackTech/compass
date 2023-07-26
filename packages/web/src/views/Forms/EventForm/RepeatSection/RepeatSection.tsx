import React, { FC, useState } from "react";
import { ColorHex } from "@core/constants/colors";
import { RRULE } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";

import { StyledRepeatContainer, StyledRepeatText } from "./styled";
import { RepeatDialog } from "./RepeatDialog";
import { SetEventFormField } from "../types";

interface Props {
  bgColor: ColorHex;
  recurrence: Schema_Event["recurrence"];
  onSetEventField: SetEventFormField;
}

export const RepeatSection: FC<Props> = ({
  bgColor,
  recurrence,
  onSetEventField,
}) => {
  const [isRepeat, setIsRepeat] = useState(recurrence?.rule.length > 0);

  const onRepeatTextClick = () => {
    setIsRepeat(!isRepeat);
    onSetEventField("recurrence", { ...recurrence, rule: [RRULE.WEEK] });
  };

  return (
    <StyledRepeatContainer>
      {isRepeat ? (
        <RepeatDialog
          bgColor={bgColor}
          rrule={recurrence?.rule}
          onSetEventField={onSetEventField}
          setIsRepeat={setIsRepeat}
        />
      ) : (
        <StyledRepeatText
          hasRepeat={isRepeat}
          onClick={onRepeatTextClick}
          tabIndex={0}
        >
          Does not repeat
        </StyledRepeatText>
      )}
    </StyledRepeatContainer>
  );
};
