import React, { FC, useState } from "react";
import { ColorHex } from "@core/constants/colors";
import { RRULE } from "@core/constants/core.constants";

import { StyledRepeatContainer, StyledRepeatText } from "./styled";
import { RepeatDialog } from "./RepeatDialog";
import { SetEventFormField } from "../types";

interface Props {
  bgColor: ColorHex;
  recurrence?: string[];
  onSetEventField: SetEventFormField;
}

export const RepeatSection: FC<Props> = ({
  bgColor,
  recurrence,
  onSetEventField,
}) => {
  const [isRepeat, setIsRepeat] = useState(recurrence?.length > 0);

  const onRepeatTextClick = () => {
    setIsRepeat(!isRepeat);
    onSetEventField("recurrence", [RRULE.WEEK]);
  };

  return (
    <StyledRepeatContainer>
      {isRepeat ? (
        <RepeatDialog
          bgColor={bgColor}
          rrule={recurrence}
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
