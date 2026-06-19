import type React from "react";
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useRef,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { darken } from "@core/util/color.utils";
import { ID_SOMEDAY_EVENT_FORM } from "@web/common/constants/web.constants";
import { type CSSVariables } from "@web/common/styles/css.types";
import {
  colorByPriority,
  hoverColorByPriority,
} from "@web/common/styles/theme.util";
import { isComboboxInteraction } from "@web/common/utils/form/form.util";
import { Flex } from "@web/components/Flex/Flex";
import { Input } from "@web/components/Input/Input";
import { Textarea } from "@web/components/Textarea/Textarea";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection";
import {
  type FormProps,
  type SetEventFormField,
} from "@web/views/Forms/EventForm/types";
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
  const latestEventRef = useRef(event);

  const setLatestEvent = useCallback(
    (nextEvent: Parameters<typeof setEvent>[0]) => {
      const resolvedEvent =
        typeof nextEvent === "function"
          ? nextEvent(latestEventRef.current)
          : nextEvent;

      if (resolvedEvent) {
        latestEventRef.current = resolvedEvent;
      }

      setEvent(resolvedEvent);
    },
    [setEvent],
  );

  const ignoreDelete = (e: KeyboardEvent) => {
    if (e.key === "Backspace") {
      e.stopPropagation();
    }

    if (e.key !== "Enter" || e.defaultPrevented) {
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
      e.stopPropagation();
      _onSubmit();
    }
  };

  const onDuplicateEvent = useCallback(() => {
    onDuplicate?.(event);
    onClose();
  }, [onDuplicate, event, onClose]);

  const onSetEventField: SetEventFormField = useCallback(
    (field) => {
      setLatestEvent({ ...latestEventRef.current, ...field });
    },
    [setLatestEvent],
  );

  const _onSubmit = useCallback(() => {
    let eventToSubmit = latestEventRef.current;
    const hasInstances = origRecurrence?.eventId !== undefined;
    const removedRecurrence =
      hasInstances && eventToSubmit.recurrence?.rule?.length === 0;

    if (removedRecurrence) {
      eventToSubmit = {
        ...eventToSubmit,
        recurrence: { ...eventToSubmit.recurrence, rule: [] },
      };
    }

    onSubmit(eventToSubmit);
  }, [origRecurrence?.eventId, onSubmit]);

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
    if (e.key === "Backspace") {
      e.stopPropagation();
      return;
    }

    if (e.defaultPrevented || e.key !== "Delete") {
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
    <form
      {...props}
      className="c-event-form"
      name={ID_SOMEDAY_EVENT_FORM}
      onClick={stopPropagation}
      onKeyDown={onKeyDown}
      onMouseDown={stopPropagation}
      onMouseUp={(e) => {
        e.stopPropagation();
      }}
      style={
        { "--event-form-bg": hoverColorByPriority[priority] } as CSSVariables
      }
    >
      <Flex className="mb-2.5 items-center justify-end gap-7.5">
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
      </Flex>

      <Input
        className="c-event-form-title"
        autoFocus
        onChange={onChangeEventTextField("title")}
        onKeyDown={ignoreDelete}
        placeholder="Title"
        title="title"
        underlineColor={colorByPriority[priority]}
        value={title}
      />

      <PrioritySection onSetEventField={onSetEventField} priority={priority} />

      <SomedayRecurrenceSection
        bgColor={bgColor}
        event={event}
        setEvent={setLatestEvent}
      />

      <Textarea
        onChange={onChangeEventTextField("description")}
        onKeyDown={ignoreDelete}
        placeholder="Description"
        underlineColor={colorByPriority[priority]}
        value={event.description || ""}
        className="c-event-form-description overflow-y-auto"
      />

      <SaveSection priority={priority} onSubmit={_onSubmit} />
    </form>
  );
};
