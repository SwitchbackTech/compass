import React, { Dispatch, MouseEvent, SetStateAction } from "react";
import { FloatingPortal } from "@floating-ui/react";
import { useFloating } from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { useAppDispatch } from "@web/store/store.hooks";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Calendar/layout.constants";
import { Text } from "@web/components/Text";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { editEventSlice } from "@web/ducks/events/event.slice";
import dayjs from "dayjs";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";

import { StyledEventOrPlaceholder } from "./styled";

export interface Props {
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  onClose: () => void;
  onSubmit: () => void;
  setEvent: Dispatch<SetStateAction<Schema_GridEvent>>;
}

export const SomedayEvent = ({
  event,
  isDrafting,
  isDragging,
  onClose,
  onSubmit,
  setEvent,
}: Props) => {
  const dispatch = useAppDispatch();

  const { y, reference, floating, strategy } = useFloating({
    strategy: "absolute",
    placement: "right-start",
  });

  const migrate = (location: "forward" | "back") => {
    const diff = location === "forward" ? 7 : -7;

    const startDate = dayjs(event.startDate)
      .add(diff, "days")
      .format(YEAR_MONTH_DAY_FORMAT);

    const endDate = dayjs(event.endDate)
      .add(diff, "days")
      .format(YEAR_MONTH_DAY_FORMAT);

    const _event = { ...event, startDate, endDate };

    dispatch(
      editEventSlice.actions.migrate({
        _id: _event._id,
        event: _event,
      })
    );
  };

  const startDrafting = (e: MouseEvent) => {
    e.stopPropagation();
    setEvent(event);
  };

  return (
    <>
      <StyledEventOrPlaceholder
        isDragging={isDragging}
        isDrafting={isDrafting}
        onClick={startDrafting}
        priority={event.priority}
        role="button"
        ref={reference}
      >
        <Text size={15}>{event.title}</Text>
        <button
          onClick={(e) => {
            e.stopPropagation();
            migrate("forward");
          }}
        >
          {">"}
        </button>
      </StyledEventOrPlaceholder>

      <FloatingPortal>
        {isDrafting && !isDragging && (
          <StyledFloatContainer
            ref={floating}
            strategy={strategy}
            top={y ?? 40}
            left={SIDEBAR_OPEN_WIDTH}
          >
            <SomedayEventForm
              event={event}
              onClose={onClose}
              onSubmit={onSubmit}
              setEvent={setEvent}
            />
          </StyledFloatContainer>
        )}
      </FloatingPortal>
    </>
  );
};
