import React, { memo } from "react";
import { Hook_Draft } from "@web/views/Calendar/hooks/draft/useDraft";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useDraftForm } from "@web/views/Calendar/hooks/draft/useDraftForm";
import { EventForm } from "@web/views/Forms/EventForm";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

import { TimedEvent } from "./TimedEvent";

interface Props {
  draft: Schema_GridEvent;
  draftHelpers: Hook_Draft["draftHelpers"];
  isDragging: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const TimedEventDraft = ({
  draft,
  draftHelpers,
  isDragging,
  measurements,
  weekProps,
}: Props) => {
  //++ move to within useDraft ?
  const onClickOut = (e: MouseEvent) => {
    // console.log("clicked out");
    if (draft.isOpen) {
      // console.log("close existing draft");
      draftHelpers.discard();
    }
  };
  const {
    attributes,
    formRef,
    popperStyles,
    setPopperElement,
    setReferenceElement,
  } = useDraftForm(onClickOut);

  return (
    <>
      <TimedEvent
        draftHelpers={draftHelpers}
        event={{ ...draft, isEditing: true }} //overlays initial event with draft
        isDraft={true}
        isDragging={isDragging}
        isPlaceholder={false}
        key={`draft-${draft?._id}`}
        measurements={measurements}
        ref={setReferenceElement}
        weekProps={weekProps}
      />

      <div ref={setPopperElement} style={popperStyles} {...attributes.popper}>
        {draft?.isOpen && (
          <div ref={formRef}>
            <EventForm
              event={draft}
              onClose={draftHelpers.discard}
              onDelete={draftHelpers.deleteEvent}
              onSubmit={draftHelpers.submit}
              setEvent={draftHelpers.setDraft}
            />
          </div>
        )}
      </div>
    </>
  );
};

export const TimedEventDraftMemo = memo(TimedEventDraft);
