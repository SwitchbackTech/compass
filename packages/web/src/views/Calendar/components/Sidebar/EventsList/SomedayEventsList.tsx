import React, { useEffect } from "react";
import { Priorities } from "@core/core.constants";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { SomedayEventContainer } from "@web/views/Calendar/containers/SomedayContainer/SomedayEventContainer";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entities";

import { Styled, StyledList } from "./styled";

export interface Props {
  eventIds: Payload_NormalizedAsyncAction;
  isProcessing?: boolean;
  getEvents: () => void;
  offset: number;
  priorities: Priorities[];
  pageSize: number;
}

export const SomedayEventsList: React.FC<Props> = ({
  eventIds,
  getEvents,
  isProcessing = false,
  offset,
  priorities,
  pageSize,
  ...props
}) => {
  useEffect(() => {
    // So here should be debounced fetching - so not every pixel resizing will cause refetching
    getEvents();
  }, [offset, priorities.length, pageSize]);

  return (
    <Styled {...props}>
      {isProcessing && <AbsoluteOverflowLoader />}

      <StyledList>
        {eventIds.map((id) => (
          <SomedayEventContainer key={id} _id={id} />
        ))}
      </StyledList>
    </Styled>
  );
};
