import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import { Dayjs } from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { SOMEDAY_EVENTS_LIMIT } from "@core/constants/core.constants";
import { ColorNames } from "@core/types/color.types";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Text } from "@web/components/Text";
import {
  selectDraftId,
  selectDraftStatus,
  selectIsGetFutureEventsProcessing,
  selectSomedayEvents,
} from "@web/ducks/events/event.selectors";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { getDefaultEvent, prepareEvent } from "@web/common/utils/event.util";
import {
  Schema_GridEvent,
  Status_DraftEvent,
} from "@web/common/types/web.event.types";
import {
  createEventSlice,
  draftSlice,
  editEventSlice,
} from "@web/ducks/events/event.slice";
import { getWeekRangeLabel } from "@web/common/utils/web.date.util";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { DraggableSomedayEvent } from "../EventsList/SomedayEvent/DraggableSomedayEvent";
import { StyledList } from "../EventsList/styled";

interface Props {
  flex?: number;
  weekRange: { weekStart: Dayjs; weekEnd: Dayjs };
}

export const SomedaySection: FC<Props> = ({ flex, weekRange }) => {
  const dispatch = useDispatch();

  const somedayRef = useRef();

  const isProcessing = useSelector(selectIsGetFutureEventsProcessing);
  const somedayEvents = useSelector(selectSomedayEvents);
  const { isDrafting: isDraftingRedux } = useSelector(selectDraftId);
  const { eventType: draftType } = useSelector(
    selectDraftStatus
  ) as Status_DraftEvent;

  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [isDraftingExisting, setIsDraftingExisting] = useState(false);

  const weekLabel = useMemo(
    () => getWeekRangeLabel(weekRange.weekStart, weekRange.weekEnd),
    [weekRange]
  );

  // memo-ize
  const existingIds = somedayEvents.map((se) => se._id);
  const isNewDraft =
    isDrafting &&
    isDraftingRedux &&
    draftType === Categories_Event.SOMEDAY &&
    !existingIds.includes(draft?._id);

  useEffect(() => {
    setIsDraftingExisting(existingIds.includes(draft?._id));
  }, [existingIds, draft]);

  useEffect(() => {
    if (!isDraftingRedux || draftType !== Categories_Event.SOMEDAY) {
      setIsDrafting(false);
      setDraft(null);
    }
  }, [draftType, isDraftingRedux]);

  useEffect(() => {
    if (isDraftingExisting) {
      dispatch(
        draftSlice.actions.start({
          eventType: Categories_Event.SOMEDAY,
        })
      );
    }
  }, [dispatch, isDraftingExisting]);

  const close = () => {
    setIsDrafting(false);
    setDraft(null);

    if (isDraftingRedux && draftType === Categories_Event.SOMEDAY) {
      dispatch(draftSlice.actions.discard());
    }
  };

  const onSubmit = () => {
    const event = prepareEvent(draft);

    const isExisting = event._id;
    if (isExisting) {
      dispatch(
        editEventSlice.actions.request({
          _id: event._id,
          event,
        })
      );
    } else {
      dispatch(createEventSlice.actions.request(event));
    }

    close();
  };

  const onSectionClick = () => {
    if (isDraftingRedux) {
      dispatch(draftSlice.actions.discard());
      return;
    }

    if (isDrafting && draft) {
      close();
      return;
    }

    const isAtLimit = somedayEvents.length >= SOMEDAY_EVENTS_LIMIT;
    if (isAtLimit) {
      alert(
        `Sorry, you can only have ${SOMEDAY_EVENTS_LIMIT} Someday events per week.`
      );
      return;
    }

    dispatch(
      draftSlice.actions.start({
        eventType: Categories_Event.SOMEDAY,
      })
    );

    const somedayDefault = getDefaultEvent(Categories_Event.SOMEDAY);
    setDraft(somedayDefault);
    setIsDrafting(true);
  };

  return (
    <Styled flex={flex} onClick={onSectionClick} ref={somedayRef}>
      {isProcessing && <AbsoluteOverflowLoader />}

      <StyledHeader
        alignItems={AlignItems.CENTER}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text colorName={ColorNames.WHITE_1} role="heading" size={22}>
          {weekLabel}
        </Text>
        <div role="button" title="Add Someday event">
          <StyledAddEventButton onClick={onSectionClick} size={27}>
            +
          </StyledAddEventButton>
        </div>
      </StyledHeader>

      <StyledList>
        {somedayEvents.map((event: Schema_Event) => (
          <DraggableSomedayEvent
            event={draft?._id === event?._id ? draft : event}
            id={event._id}
            isDrafting={
              isDraftingExisting && isDraftingRedux && draft?._id === event?._id
            }
            key={event._id}
            onClose={close}
            onSubmit={onSubmit}
            setEvent={setDraft}
          />
        ))}

        {isNewDraft && (
          <DraggableSomedayEvent
            event={draft}
            id={"somedayDraft"}
            isDrafting={isNewDraft && isDraftingRedux}
            key={"somedayKey"}
            onClose={close}
            onSubmit={onSubmit}
            setEvent={setDraft}
          />
        )}
      </StyledList>
    </Styled>
  );
};
