import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePopper } from "react-popper";
import dayjs from "dayjs";
import { Priorities } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { ArrowLeftIcon } from "@web/assets/svg";
import { SectionType_Sidebar } from "@web/ducks/events/types";
import { selectPaginatedEventsBySectionType } from "@web/ducks/events/selectors";
import { RootState } from "@web/store";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { createEventSlice } from "@web/ducks/events/slice";
import { YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT } from "@web/common/constants/dates";
import { ZIndex } from "@web/common/constants/web.constants";
import { SomedayEventForm } from "@web/views/SomedayEventForm";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";

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
  eventStartDate?: string;
  flex?: number;
}

export const ToggleableEventsListSection: React.FC<Props> = ({
  EventsListContainer,
  title,
  sectionType,
  priorities,
  isToggled: isParentToggled,
  onToggle: onParentToggle,
  eventStartDate,
  flex,
  ...props
}) => {
  const dispatch = useDispatch();
  const eventsListRef = useRef<HTMLDivElement>(null);

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
  const popperStyles = { ...styles.popper, zIndex: ZIndex.LAYER_3 };

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

  const today = dayjs(eventStartDate);
  const startDate = today.format(YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT);
  const endDate = today
    .add(1, "hour")
    .format(YEAR_MONTH_DAY_HOURS_MINUTES_FORMAT);

  const [event, setEvent] = useState<Schema_Event>({
    startDate,
    endDate,
    priority: Priorities.UNASSIGNED,
  });

  const isToggled = isParentToggled || _isToggled;

  const onSubmit = (eventToSubmit: Schema_Event) => {
    setIsEventFormOpen(false);
    dispatch(createEventSlice.actions.request(eventToSubmit));
  };
  const onToggle = onParentToggle || (() => setIsToggled((toggle) => !toggle));
  const showNextPageButton = count > pageSize + offset;

  return (
    <Styled flex={flex} {...props}>
      <StyledHeader alignItems={AlignItems.CENTER}>
        {/* <ToggleArrow isToggled={isToggled} onToggle={onToggle} /> */}
        <StyledHeaderTitle size={18}>{title}</StyledHeaderTitle>

        <StyledAddEventButton
          size={25}
          onClick={() => setIsEventFormOpen((open) => !open)}
          ref={setPopperRef}
        >
          +
        </StyledAddEventButton>

        <div ref={setPopperElement} style={popperStyles} {...attributes.popper}>
          {isEventFormOpen && (
            <SomedayEventForm
              event={event}
              isOpen={isEventFormOpen}
              // setIsOpen={setIsEventFormOpen}
              setEvent={setEvent}
              onSubmit={onSubmit}
              onClose={() => setIsEventFormOpen(false)}
            />
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
