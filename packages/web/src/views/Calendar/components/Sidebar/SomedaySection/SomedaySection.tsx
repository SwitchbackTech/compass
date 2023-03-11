import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ReactSortable } from "react-sortablejs";
import dayjs, { Dayjs } from "dayjs";
import {
  SOMEDAY_WEEKLY_LIMIT,
  SOMEDAY_WEEK_LIMIT_MSG,
} from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { getWeekRangeDates } from "@core/util/date.utils";
import { ColorNames } from "@core/types/color.types";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Text } from "@web/components/Text";
import {
  selectDraftId,
  selectDraftStatus,
  selectIsGetSomedayEventsProcessing,
  selectSomedayEvents,
} from "@web/ducks/events/event.selectors";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import {
  getDefaultEvent,
  prepEvtBeforeSubmit,
} from "@web/common/utils/event.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  createEventSlice,
  draftSlice,
  editEventSlice,
} from "@web/ducks/events/event.slice";
import { getWeekRangeLabel } from "@web/common/utils/web.date.util";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { DragItem_Someday } from "@web/common/types/dnd.types";

import { Styled, StyledAddEventButton, StyledHeader } from "./styled";
import { DraggableSomedayEvent } from "../EventsList/SomedayEvent/DraggableSomedayEvent";
import { StyledList } from "../EventsList/styled";

interface Props {
  flex?: number;
  weekRange: { weekStart: Dayjs; weekEnd: Dayjs };
}

export const SomedaySection: FC<Props> = ({ flex, weekRange }) => {
  const dispatch = useAppDispatch();

  const somedayRef = useRef();

  const isProcessing = useAppSelector(selectIsGetSomedayEventsProcessing);
  const _somedayEvents = useAppSelector(selectSomedayEvents);

  const { isDrafting: isDraftingRedux } = useAppSelector(selectDraftId);
  const { eventType: draftType } = useAppSelector(selectDraftStatus);

  const [draft, setDraft] = useState<Schema_GridEvent | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isDraftingExisting, setIsDraftingExisting] = useState(false);
  const [somedayEvents, setSomedayEvents] = useState(_somedayEvents);

  useEffect(() => {
    // setSomedayEvents(_somedayEvents.sort((a, b) => a.order - b.order));
    const somedayEventsWithSortableId = _somedayEvents.map((e) => ({
      ...e,
      id: e._id,
    }));
    setSomedayEvents(somedayEventsWithSortableId);
    // setSomedayEvents(_somedayEvents);
  }, [_somedayEvents]);

  const weekLabel = useMemo(
    () => getWeekRangeLabel(weekRange.weekStart, weekRange.weekEnd),
    [weekRange]
  );

  const existingIds = somedayEvents?.map((se) => se?._id);
  const isNewDraft =
    isDrafting &&
    isDraftingRedux &&
    draftType === Categories_Event.SOMEDAY &&
    !existingIds.includes(draft?._id);

  const _isAtLimit = useCallback(() => {
    return somedayEvents.length >= SOMEDAY_WEEKLY_LIMIT;
  }, [somedayEvents]);

  const createDefaultSomeday = useCallback(() => {
    const somedayDefault = getDefaultEvent(Categories_Event.SOMEDAY);
    setDraft({
      ...somedayDefault,
      startDate: weekRange.weekStart.format(YEAR_MONTH_DAY_FORMAT),
      endDate: weekRange.weekEnd.format(YEAR_MONTH_DAY_FORMAT),
    });
    setIsDrafting(true);
  }, [weekRange.weekEnd, weekRange.weekStart]);

  const close = () => {
    setIsDrafting(false);
    setDraft(null);

    if (isDraftingRedux && draftType === Categories_Event.SOMEDAY) {
      dispatch(draftSlice.actions.discard());
    }
  };

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

  const handleSomedayShortcut = useCallback(() => {
    if (
      isDraftingRedux &&
      draftType === Categories_Event.SOMEDAY &&
      !isDraftingExisting
    ) {
      if (_isAtLimit()) {
        alert(SOMEDAY_WEEK_LIMIT_MSG);
        return;
      }
      createDefaultSomeday();
    }
  }, [
    createDefaultSomeday,
    draftType,
    isDraftingExisting,
    isDraftingRedux,
    _isAtLimit,
  ]);

  useEffect(() => {
    handleSomedayShortcut();
  }, [handleSomedayShortcut]);

  const onDraft = (event: Schema_Event) => {
    setDraft({
      ...event,
      startDate: weekRange.weekStart.format(YEAR_MONTH_DAY_FORMAT),
      endDate: weekRange.weekEnd.format(YEAR_MONTH_DAY_FORMAT),
    });
  };

  const onMigrate = (event: Schema_Event, location: "forward" | "back") => {
    const diff = location === "forward" ? 7 : -7;

    const startDate = dayjs(event.startDate)
      .add(diff, "days")
      .format(YEAR_MONTH_DAY_FORMAT);

    const endDate = dayjs(event.endDate)
      .add(diff, "days")
      .format(YEAR_MONTH_DAY_FORMAT);

    const _event = { ...event, startDate, endDate };

    const isExisting = _event._id;
    if (isExisting) {
      dispatch(
        editEventSlice.actions.migrate({
          _id: _event._id,
          event: _event,
        })
      );
    } else {
      dispatch(createEventSlice.actions.request(_event));
    }

    close();
  };

  const onSubmit = () => {
    const _event = prepEvtBeforeSubmit(draft);
    const { startDate, endDate } = getWeekRangeDates(
      weekRange.weekStart,
      weekRange.weekEnd
    );
    const event = { ..._event, startDate, endDate };

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

    if (_isAtLimit()) {
      alert(SOMEDAY_WEEK_LIMIT_MSG);
      return;
    }

    dispatch(
      draftSlice.actions.start({
        eventType: Categories_Event.SOMEDAY,
      })
    );

    createDefaultSomeday();
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

        <div onClick={(e) => e.stopPropagation()}>
          <TooltipWrapper
            description="Add to this week"
            onClick={onSectionClick}
            shortcut="S"
          >
            <div role="button">
              <StyledAddEventButton size={25}>+</StyledAddEventButton>
            </div>
          </TooltipWrapper>
        </div>
      </StyledHeader>

      <StyledList>
        <ReactSortable
          animation={120}
          list={somedayEvents}
          setList={setSomedayEvents}
        >
          {somedayEvents.map((event: Schema_Event) => (
            <DraggableSomedayEvent
              event={draft?._id === event?._id ? draft : event}
              id={event._id}
              isDrafting={
                isDraftingExisting &&
                isDraftingRedux &&
                draft?._id === event?._id
              }
              key={event._id}
              onClose={close}
              onDraft={onDraft}
              onMigrate={onMigrate}
              onSubmit={onSubmit}
              setEvent={setDraft}
            />
          ))}
        </ReactSortable>

        {isNewDraft && (
          <DraggableSomedayEvent
            event={draft}
            id={"somedayDraft"}
            isDrafting={isNewDraft && isDraftingRedux}
            key={"somedayKey"}
            onClose={close}
            onDraft={onDraft}
            onMigrate={onMigrate}
            onSubmit={onSubmit}
            setEvent={setDraft}
          />
        )}
      </StyledList>
    </Styled>
  );
};
