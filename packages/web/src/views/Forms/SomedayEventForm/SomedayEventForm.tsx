import React, { KeyboardEvent, MouseEvent, useCallback, useRef } from "react";
import { Key } from "ts-key-enum";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { darken } from "@core/util/color.utils";
import { ID_SOMEDAY_EVENT_FORM } from "@web/common/constants/web.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { isComboboxInteraction } from "@web/common/utils/form/form.util";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection";
import {
  StyledDescription,
  StyledEventForm,
  StyledIconRow,
  StyledTitle,
} from "@web/views/Forms/EventForm/styled";
import { FormProps, SetEventFormField } from "@web/views/Forms/EventForm/types";
import { SomedayEventActionMenu } from "@web/views/Forms/SomedayEventForm/SomedayEventActionMenu";
import { SomedayRecurrenceSection } from "@web/views/Forms/SomedayEventForm/SomedayRecurrenceSection/SomedayRecurrenceSection";
import { useSomedayFormShortcuts } from "@web/views/Forms/SomedayEventForm/useSomedayFormShortcuts";

export const SomedayEventForm: React.FC<FormProps> = ({
  event,
  category,
  onClose,
  onMigrate,
  onSubmit,
  onDuplicate,
  onDelete: onDeleteEvent,
  setEvent,
  ...props
}) => {
  const target = category === Categories_Event.SOMEDAY_WEEK ? "week" : "month";
  const { priority = Priorities.UNASSIGNED, title } = event || {};
  const bgColor = colorByPriority[priority];

  const origRecurrence = useRef(event?.recurrence).current;

  const ignoreDelete = (e: KeyboardEvent) => {
    if (e.key === Key.Backspace) {
      e.stopPropagation();
    }

    if (e.key !== Key.Enter || e.defaultPrevented) {
      return;
    }

    if (isComboboxInteraction(e.nativeEvent)) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const isTextArea = target?.tagName === "TEXTAREA";

    if (isTextArea && !e.metaKey) {
      return;
    }

    if (e.metaKey || !isTextArea) {
      e.preventDefault();
      _onSubmit();
    }
  };

  const onDuplicateEvent = useCallback(() => {
    onDuplicate?.(event);
    onClose();
  }, [onDuplicate, event, onClose]);

  const onSetEventField: SetEventFormField = useCallback(
    (field) => {
      const newEvent = { ...event, ...field };

      if (field === null) {
        delete newEvent[field];
      }

      setEvent(newEvent);
    },
    [event, setEvent],
  );

  const _onSubmit = useCallback(() => {
    const hasInstances = origRecurrence?.eventId !== undefined;
    const removedRecurrence =
      hasInstances && event.recurrence?.rule?.length === 0;

    if (removedRecurrence) {
      onSetEventField({ recurrence: { ...event.recurrence, rule: [] } });
    }

    onSubmit(event);
  }, [origRecurrence?.eventId, event, onSubmit, onSetEventField]);

  const onChangeEventTextField =
    <T extends HTMLInputElement | HTMLTextAreaElement = HTMLTextAreaElement>(
      fieldName: "title" | "description",
    ) =>
    (e: React.ChangeEvent<T>) => {
      onSetEventField({ [fieldName]: e.target.value });
    };

  const onDelete = useCallback(() => {
    onDeleteEvent();
    onClose();
  }, [onDeleteEvent, onClose]);

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === Key.Backspace) {
      e.stopPropagation();
      return;
    }

    if (e.defaultPrevented || e.key !== Key.Delete) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  useSomedayFormShortcuts({
    event,
    category,
    onSubmit: _onSubmit,
    onDelete,
    onDuplicate: onDuplicateEvent,
    onMigrate,
  });

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <StyledEventForm
      {...props}
      name={ID_SOMEDAY_EVENT_FORM}
      isOpen={true}
      onClick={stopPropagation}
      onKeyDown={onKeyDown}
      onMouseDown={stopPropagation}
      onMouseUp={(e) => {
        e.stopPropagation();
      }}
      priority={priority}
      role="form"
    >
      <StyledIconRow>
        <SomedayEventActionMenu
          bgColor={darken(colorByPriority[priority])}
          target={target}
          onMigrateBackwardClick={() => {
            onMigrate?.(event, category, "back");
          }}
          onMigrateForwardClick={() => {
            onMigrate?.(event, category, "forward");
          }}
          onMigrateAboveClick={() => {
            onMigrate?.(event, category, "up");
          }}
          onMigrateBelowClick={() => {
            onMigrate?.(event, category, "down");
          }}
          onDuplicateClick={onDuplicateEvent}
          onDeleteClick={onDelete}
        />
      </StyledIconRow>

      <StyledTitle
        autoFocus
        onChange={onChangeEventTextField("title")}
        onKeyDown={ignoreDelete}
        placeholder="Title"
        role="input"
        title="title"
        underlineColor={colorByPriority[priority]}
        value={title}
      />

      <PrioritySection onSetEventField={onSetEventField} priority={priority} />

      <SomedayRecurrenceSection
        bgColor={bgColor}
        event={event}
        setEvent={setEvent}
      />

      <StyledDescription
        onChange={onChangeEventTextField("description")}
        onKeyDown={ignoreDelete}
        placeholder="Description"
        underlineColor={colorByPriority[priority]}
        value={event.description || ""}
        className="overflow-y-auto"
      />

      <SaveSection priority={priority} onSubmit={_onSubmit} />
    </StyledEventForm>
  );
};
