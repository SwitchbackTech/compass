import React, { useEffect } from "react";
// import { DndProvider } from "react-dnd";
// import HTML5Backend from "react-dnd-html5-backend";
import { Priorities } from "@core/core.constants";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { SidebarEventContainer } from "@web/views/Calendar/containers/SidebarEventContainer";
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
        {/* <DndProvider backend={HTML5Backend}> */}
        {eventIds.map((id) => (
          <SidebarEventContainer key={id} _id={id} />
        ))}
        {/* </DndProvider> */}
      </StyledList>
    </Styled>
  );
};
