import React, { FC, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Origin, Priorities, SOMEDAY_EVENTS_LIMIT } from "@core/core.constants";
import { usePopper } from "react-popper";
import { ZIndex } from "@web/common/constants/web.constants";
import {
  createEventSlice,
  getFutureEventsSlice,
} from "@web/ducks/events/slice";
import {
  selectIsGetFutureEventsProcessing,
  selectSomedayEvents,
} from "@web/ducks/events/selectors";
import { Schema_Event } from "@core/types/event.types";
import { AlignItems } from "@web/components/Flex/styled";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { DraggableSomedayEvent } from "../EventsList/SomedayEvent/DraggableSomedayEvent";
import { StyledList } from "../EventsList/styled";

interface Props {
  flex?: number;
}

export const SomedaySection: FC<Props> = ({ flex }) => {
  const dispatch = useDispatch();

  const isProcessing = useSelector(selectIsGetFutureEventsProcessing);
  const somedayEvents = useSelector(selectSomedayEvents);

  const formRef = useRef<HTMLDivElement>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [popperRef, setPopperRef] = useState<HTMLElement>(null);
  const [popperElement, setPopperElement] = useState<HTMLElement>(null);

  useOnClickOutside(formRef, () => setIsEventFormOpen(false));

  const { styles, attributes } = usePopper(popperRef, popperElement, {
    placement: "right",
    strategy: "fixed",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 285],
        },
      },
    ],
  });
  const popperStyles = { ...styles.popper, zIndex: ZIndex.LAYER_2 };

  const eventBase = {
    description: "",
    isSomeday: true,
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    title: "",
  };

  const [event, setEvent] = useState<Schema_GridEvent | null>(eventBase);

  /***********
   * Handlers *
   ***********/
  const onSubmit = () => {
    setIsEventFormOpen(false);
    resetSomedayFormState();

    dispatch(createEventSlice.actions.request(event));
  };

  const resetSomedayFormState = () => {
    setEvent(eventBase);
  };

  return (
    <Styled flex={flex}>
      {isProcessing && <AbsoluteOverflowLoader />}
      <StyledHeader alignItems={AlignItems.CENTER}>
        {/* <ToggleArrow isToggled={isToggled} onToggle={onToggle} /> */}

        <StyledAddEventButton
          onClick={() => {
            if (somedayEvents.length >= SOMEDAY_EVENTS_LIMIT) {
              alert(`
                Sorry, you can only have ${SOMEDAY_EVENTS_LIMIT} Someday events for now.
                This will be increased in a future update
                `);
              return;
            }
            setIsEventFormOpen((open) => !open);
          }}
          ref={setPopperRef}
          role="button"
          size={25}
          title="Add Someday event"
        >
          +
        </StyledAddEventButton>
        <div ref={setPopperElement} style={popperStyles} {...attributes.popper}>
          {isEventFormOpen && (
            <div ref={formRef}>
              <SomedayEventForm
                cleanup={resetSomedayFormState}
                event={event}
                isOpen={isEventFormOpen}
                onClose={() => {
                  setIsEventFormOpen(false);
                  resetSomedayFormState();
                }}
                onSubmit={onSubmit}
                setEvent={setEvent}
              />
            </div>
          )}
        </div>
        {/* <StyledPaginationFlex
          justifyContent={JustifyContent.SPACE_BETWEEN}
          alignItems={AlignItems.CENTER}
        >
          <StyledArrowButton
            disabled={!offset}
            justifyContent={JustifyContent.CENTER}
            alignItems={AlignItems.CENTER}
            onClick={() =>
              setOffset((currentOffset) =>
                pageSize <= currentOffset ? currentOffset - pageSize : 0
              )
            }
          >
            <ArrowLeftIcon />
          </StyledArrowButton>

          <StyledArrowButton
            disabled={!showNextPageButton}
            justifyContent={JustifyContent.CENTER}
            alignItems={AlignItems.CENTER}
            onClick={() =>
              showNextPageButton &&
              setOffset((currentOffset) => currentOffset + pageSize)
            }
          >
            <ArrowLeftIcon transform="rotate(180)" />
          </StyledArrowButton>
        </StyledPaginationFlex> */}
      </StyledHeader>
      <StyledList>
        {somedayEvents.map((event: Schema_Event) => (
          <DraggableSomedayEvent
            id={event._id}
            key={event._id}
            event={event}
            title={event.title}
          />
        ))}
      </StyledList>
    </Styled>
  );
};
