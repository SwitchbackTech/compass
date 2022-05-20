import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePopper } from "react-popper";
import { Origin, Priorities, SOMEDAY_EVENTS_LIMIT } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { ArrowLeftIcon } from "@web/assets/svg";
import { SectionType_Sidebar } from "@web/ducks/events/types";
import {
  selectPaginatedEventsBySectionType,
  selectSomedayEventsCount,
} from "@web/ducks/events/selectors";
import { RootState } from "@web/store";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import {
  createEventSlice,
  getFutureEventsSlice,
} from "@web/ducks/events/slice";
import { ZIndex } from "@web/common/constants/web.constants";
import { SomedayEventForm } from "@web/views/Forms/SomedayEventForm";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { Schema_GridEvent } from "@web/views/Calendar/weekViewHooks/types";

import {
  Styled,
  StyledAddEventButton,
  StyledArrowButton,
  StyledEventsList,
  StyledHeader,
  StyledHeaderTitle,
  StyledPaginationFlex,
} from "./styled";
import { ToggleArrow } from "../ToggleArrow";

export interface EventsListProps {
  offset: number;
  sectionType: SectionType_Sidebar;
  priorities: Priorities[];
  pageSize: number;
}

export interface Props {
  title: string;
  EventsListContainer: React.ComponentType<EventsListProps>;
  sectionType: SectionType_Sidebar;
  priorities: Priorities[];
  isToggled?: boolean;
  onToggle?: () => void;
  flex?: number;
}

export const OldSomedaySection: React.FC<Props> = ({
  EventsListContainer,
  title,
  sectionType,
  priorities,
  isToggled: isParentToggled,
  onToggle: onParentToggle,
  flex,
  ...props
}) => {
  const dispatch = useDispatch();
  const eventsListRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const somedayEventsCount = useSelector(selectSomedayEventsCount);
  const paginatedEventsData = useSelector((state: RootState) =>
    selectPaginatedEventsBySectionType(state, sectionType)
  );
  const { count = 0 } = paginatedEventsData || {};

  const [pageSize, setPageSize] = useState(1);
  const [offset, setOffset] = useState(0);
  const [_isToggled, setIsToggled] = useState(false);
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

  useEffect(() => {
    setTimeout(() => {
      if (eventsListRef.current?.clientHeight) {
        const computedPageSize = Math.floor(
          (eventsListRef.current.clientHeight - 40) / 34
        );

        setPageSize(computedPageSize || 1);
      }
    });
  }, [eventsListRef.current?.clientHeight]);

  const eventBase = {
    description: "",
    isSomeday: true,
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    title: "",
  };

  const [event, setEvent] = useState<Schema_GridEvent | null>(eventBase);

  const isToggled = isParentToggled || _isToggled;

  const onSubmit = () => {
    setIsEventFormOpen(false);
    resetSomedayFormState();

    dispatch(createEventSlice.actions.request(event));
  };

  const onToggle = onParentToggle || (() => setIsToggled((toggle) => !toggle));

  const resetSomedayFormState = () => {
    setEvent(eventBase);
  };

  const showNextPageButton = count > pageSize + offset;

  return (
    <Styled flex={flex} {...props}>
      <StyledHeader alignItems={AlignItems.CENTER}>
        {/* <ToggleArrow isToggled={isToggled} onToggle={onToggle} /> */}
        <StyledHeaderTitle size={18}>{title}</StyledHeaderTitle>

        <StyledAddEventButton
          size={25}
          onClick={() => {
            if (somedayEventsCount >= SOMEDAY_EVENTS_LIMIT) {
              alert(`
                Sorry, you can only have ${SOMEDAY_EVENTS_LIMIT} Someday events for now.
                This will be increased in a future update
                `);
              return;
            }

            setIsEventFormOpen((open) => !open);
          }}
          ref={setPopperRef}
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

      {isToggled && (
        <StyledEventsList ref={eventsListRef}>
          <EventsListContainer
            pageSize={pageSize}
            priorities={priorities}
            sectionType={sectionType}
            offset={offset}
          />
        </StyledEventsList>
      )}
    </Styled>
  );
};
