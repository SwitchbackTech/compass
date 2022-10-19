import React, { FC, MouseEvent, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SOMEDAY_EVENTS_LIMIT } from "@core/constants/core.constants";
import { ColorNames } from "@core/types/color.types";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Text } from "@web/components/Text";
import {
  selectDraftId,
  selectIsGetFutureEventsProcessing,
  selectSomedayEvents,
} from "@web/ducks/events/event.selectors";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";
import { getDefaultEvent } from "@web/common/utils/event.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
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

  const isProcessing = useSelector(selectIsGetFutureEventsProcessing);
  const somedayEvents = useSelector(selectSomedayEvents);
  const { isDrafting: isDraftingRedux } = useSelector(selectDraftId);

  const draftUtil = useDraftUtils();

  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);

  const somedayRef = useRef();

  // useOnClickOutside(somedayRef, (e: MouseEvent) => {
  //   console.log("clicked out");
  //   if (isDrafting) {
  //     e.stopPropagation();
  //     e.preventDefault();

  //     console.log("clicked out, closing drafts");
  //     setIsDrafting(false);
  //     setDraft(null);

  //     dispatch(draftSlice.actions.discard());
  //   }
  // });

  const onClose = () => {
    setIsDrafting(false);
    setDraft(null);
  };

  const onSubmit = () => {
    draftUtil.submit(draft);

    onClose();
  };

  const onSectionClick = (e: MouseEvent) => {
    e.stopPropagation();

    if (isDraftingRedux) {
      console.log("closing redux draft");
      dispatch(draftSlice.actions.discard());
      // return;
    }

    if (isDrafting) {
      console.log("clsoing local draft");
      onClose();
      return;
    }

    dispatch(
      draftSlice.actions.start({
        eventType: Categories_Event.SOMEDAY,
        // event,
      })
    );

    if (isDrafting || draft) {
      setDraft(null);
      setIsDrafting(false);
      return;
    }

    //   const isNotAlreadyDrafting = !isDraftingRedux && !isDrafting;
    //   if (isNotAlreadyDrafting) {
    //     setIsDrafting(true);
    //   }

    const isAtLimit = somedayEvents.length >= SOMEDAY_EVENTS_LIMIT;
    if (isAtLimit) {
      alert(
        `Sorry, you can only have ${SOMEDAY_EVENTS_LIMIT} Someday events per week.`
      );
      return;
    }

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
            isDrafting={draft?._id === event?._id}
            key={event._id}
            onClose={onClose}
            onSubmit={onSubmit}
            setEvent={setDraft}
          />
        ))}

        {isDrafting && (
          <DraggableSomedayEvent
            event={draft}
            id={"somedayDraft"}
            isDrafting={true}
            key={"somedayKey"}
            onClose={onClose}
            onSubmit={onSubmit}
            setEvent={setDraft}
          />
        )}
      </StyledList>
    </Styled>
  );
};
