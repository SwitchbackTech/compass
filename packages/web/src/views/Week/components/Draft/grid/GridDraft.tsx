import { FloatingFocusManager } from "@floating-ui/react";
import {
  type FC,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getEventDragOffset } from "@web/common/utils/event/event.util";
import { EventForm } from "@web/views/Forms/EventForm/EventForm";
import { StyledFloatContainer } from "@web/views/Forms/SomedayEventForm/styled";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { GridEvent } from "@web/views/Week/components/Event/Grid";
import { useGridEventMouseDown } from "@web/views/Week/hooks/grid/useGridEventMouseDown";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  applyDraftDomPosition,
  resetDraftDomPosition,
} from "@web/views/Week/interaction/dom/applyDraftDomPosition";

interface Props {
  draft: Schema_GridEvent;
  isDragging: boolean;
  isResizing: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const GridDraft: FC<Props> = ({
  draft,
  isDragging,
  isResizing,
  measurements,
  weekProps,
}) => {
  const { actions, interaction, setters, state, confirmation } =
    useDraftContext();
  const draftElementRef = useRef<HTMLDivElement | null>(null);
  const { discard, duplicateEvent } = actions;
  const { startDragging } = actions;
  const { setDraft, setDateBeingChanged, setIsResizing } = setters;
  const { formProps, isFormOpen } = state;
  const { context, getReferenceProps, getFloatingProps, x, y, refs, strategy } =
    formProps;

  const setReference = useCallback(
    (element: HTMLDivElement | null) => {
      draftElementRef.current = element;
      refs.setReference(element);
    },
    [refs.setReference],
  );

  useEffect(() => {
    const element = draftElementRef.current;
    if (!element) return;

    const applyLiveDraftPosition = () => {
      const liveDraft = interaction.getSnapshot().draft;
      if (!liveDraft) return;

      applyDraftDomPosition({
        baseDraft: draft,
        draft: liveDraft,
        element,
        endOfView: weekProps.component.endOfView,
        measurements,
        startOfView: weekProps.component.startOfView,
      });
    };

    applyLiveDraftPosition();
    const unsubscribe = interaction.subscribeMotion(applyLiveDraftPosition);

    return () => {
      unsubscribe();
      resetDraftDomPosition(element);
    };
  }, [
    draft,
    interaction,
    measurements,
    weekProps.component.endOfView,
    weekProps.component.startOfView,
  ]);

  const onConvert = () => {
    const start = weekProps.component.startOfView.format(YEAR_MONTH_DAY_FORMAT);
    const end = weekProps.component.endOfView.format(YEAR_MONTH_DAY_FORMAT);

    actions.convert(start, end);
  };

  const handleClick = () => {};
  const handleDrag = (_: Schema_GridEvent, moveEvent: PartialMouseEvent) => {
    if (!draft) return; // TS Guard

    const newDraft = {
      ...draft,
      position: {
        ...draft.position,
        dragOffset: getEventDragOffset(draft, moveEvent),
        initialX: moveEvent.clientX,
        initialY: moveEvent.clientY,
      },
    };

    setDraft(newDraft);
    startDragging();
  };

  const { onSubmit, onDelete } = confirmation;

  const { onMouseDown } = useGridEventMouseDown(
    draft?.isAllDay ? Categories_Event.ALLDAY : Categories_Event.TIMED,
    handleClick,
    handleDrag,
  );

  if (!draft) return null;

  return (
    <>
      <GridEvent
        event={draft}
        isDragging={isDragging}
        isDraft={true}
        isPlaceholder={false}
        isResizing={isResizing}
        key={`draft-${draft?._id}`}
        measurements={measurements}
        onEventMouseDown={(event: Schema_GridEvent, e: MouseEvent) => {
          e.preventDefault();
          onMouseDown(e, event);
        }}
        onScalerMouseDown={(
          _event: Schema_GridEvent,
          e: MouseEvent,
          dateToChange: "startDate" | "endDate",
        ) => {
          e.stopPropagation();
          e.preventDefault();
          setDateBeingChanged(dateToChange);
          setIsResizing(true);
        }}
        ref={setReference}
        weekProps={weekProps}
        {...getReferenceProps()}
      />

      <div>
        {isFormOpen && (
          <FloatingFocusManager context={context}>
            <StyledFloatContainer
              ref={refs.setFloating}
              strategy={strategy}
              top={y ?? 0}
              left={x ?? 0}
              {...getFloatingProps()}
            >
              <EventForm
                event={draft as Schema_Event}
                onClose={discard}
                onConvert={onConvert}
                onDelete={onDelete}
                onDuplicate={duplicateEvent}
                isDraft={!draft._id}
                isExistingEvent={!!draft._id}
                onSubmit={(event) => {
                  if (event) void onSubmit(event as Schema_GridEvent);
                }}
                setEvent={(nextEvent) => {
                  const event =
                    typeof nextEvent === "function"
                      ? nextEvent(draft)
                      : nextEvent;
                  setDraft(event as Schema_GridEvent | null);
                }}
              />
            </StyledFloatContainer>
          </FloatingFocusManager>
        )}
      </div>
    </>
  );
};
