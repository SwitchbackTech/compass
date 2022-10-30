import React, { FC, MouseEvent, useEffect, useRef, useState } from "react";
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
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { getDefaultEvent } from "@web/common/utils/event.util";
import {
  Schema_GridEvent,
  Status_DraftEvent,
} from "@web/common/types/web.event.types";
import { useDraftUtils } from "@web/views/Calendar/hooks/draft/useDraftUtils";
import { draftSlice } from "@web/ducks/events/event.slice";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { DraggableSomedayEvent } from "../EventsList/SomedayEvent/DraggableSomedayEvent";
import { StyledList } from "../EventsList/styled";

interface Props {
  flex?: number;
}

export const SomedaySection: FC<Props> = ({ flex }) => {
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

  const draftUtil = useDraftUtils();

  //++ memo-ize
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
    if (!isDraftingRedux) {
      setIsDrafting(false);
      setDraft(null);
    }
  }, [isDraftingRedux]);

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
    draftUtil.submit(draft);

    dispatch(draftSlice.actions.discard());

    close();
  };

  const onSectionClick = (e: MouseEvent) => {
    // console.log("clicked someday section");
    // e.stopPropagation();
    // e.preventDefault();

    if (isDraftingRedux) {
      dispatch(draftSlice.actions.discard());
      return;
    }

    if (isDrafting && draft) {
      console.log("clsoing someday local draft");
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
        <Text colorName={ColorNames.WHITE_1} role="heading" size={27}>
          Someday
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
              // isDraftingExisting && draft?._id === event?._id
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
