import React from "react";
import { Text } from "@web/components/Text";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { ZIndex } from "@web/common/constants/web.constants";
import { getTimesLabel } from "@web/common/utils/web.date.util";

import { StyledTimes } from "./styled";

interface Props {
  event: Schema_GridEvent;
  isDrafting: boolean;
  isPlaceholder: boolean;
}
export const Times: React.FC<Props> = ({
  event,
  isDrafting,
  isPlaceholder,
}) => {
  const shouldRevealBox = !isPlaceholder && !isDrafting;

  return (
    <StyledTimes revealBox={shouldRevealBox}>
      <Text role="textbox" size="xs" zIndex={ZIndex.LAYER_3}>
        {getTimesLabel(event.startDate, event.endDate)}
      </Text>
    </StyledTimes>
  );
};
