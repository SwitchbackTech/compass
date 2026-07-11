import classNames from "classnames";
import type React from "react";
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useRef,
} from "react";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { ID_SOMEDAY_EVENT_FORM } from "@web/common/constants/web.constants";
import { darken } from "@web/common/styles/color.utils";
import { colorByPriority } from "@web/common/styles/theme.util";
import {
  isComboboxInteraction,
  isDeleteTextEditingTarget,
} from "@web/common/utils/form/form.util";
import {
  Focusable,
  INPUT_RESET_CLASSNAME,
} from "@web/components/Focusable/Focusable";
import { Textarea } from "@web/components/Textarea/Textarea";
import { PrioritySection } from "@web/views/Forms/EventForm/PrioritySection";
import { SaveSection } from "@web/views/Forms/EventForm/SaveSection";
import { TitleActionsRow } from "@web/views/Forms/EventForm/TitleActionsRow";
import {
  type FormProps,
  type SetEventFormField,
} from "@web/views/Forms/EventForm/types";
import { EventFormShell } from "@web/views/Forms/EventFormShell";
import { SomedayEventActionMenu } from "@web/views/Forms/SomedayEventForm/SomedayEventActionMenu";
import { SomedayRecurrenceSection } from "@web/views/Forms/SomedayEventForm/SomedayRecurrenceSection/SomedayRecurrenceSection";
import { useSomedayFormShortcuts } from "@web/views/Forms/SomedayEventForm/useSomedayFormShortcuts";

export const SomedayEventForm: React.FC<FormProps> = ({
  event,
  category,
  isDraft,
  isExistingEvent: _isExistingEvent,
  onClose,
  onMigrate,
  onSubmit,
  onDuplicate,
  onDelete: onDeleteEvent,
  setEvent,
  ...props
}) => {
  const target = category === Categories_Event.SOMEDAY_WEEK ? "week" : "month";
  const { priority = Priorities.UNASSIGNED } = event;
  const title = event.content.kind === "details" ? event.content.title : "";
  const bgColor = colorByPriority[priority];

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
    if (e.key === "Backspace" || e.key === "Delete") {
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
      const content =
        latestEventRef.current.content.kind === "details"
          ? latestEventRef.current.content
          : { kind: "details" as const, title: "", description: "" };
      setLatestEvent({
        ...latestEventRef.current,
        content: {
          kind: "details",
          title: field.title ?? content.title,
          description: field.description ?? content.description,
        },
        ...(field.priority === undefined ? {} : { priority: field.priority }),
        ...(field.schedule === undefined ? {} : { schedule: field.schedule }),
      });
    },
    [setLatestEvent],
  );

  const _onSubmit = useCallback(() => {
    onSubmit(latestEventRef.current);
  }, [onSubmit]);

  const onChangeEventTextField =
    <T extends HTMLInputElement | HTMLTextAreaElement = HTMLTextAreaElement>(
      fieldName: "title" | "description",
    ) =>
    (e: React.ChangeEvent<T>) => {
      onSetEventField({ [fieldName]: e.target.value });
    };

  const onDelete = useCallback(() => {
    if (isDraft) {
      onClose();
      return;
    }

    onDeleteEvent();
    onClose();
  }, [isDraft, onDeleteEvent, onClose]);

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Backspace") {
      e.stopPropagation();
      return;
    }

    if (e.defaultPrevented || e.key !== "Delete") {
      return;
    }

    if (isDeleteTextEditingTarget(e)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  useSomedayFormShortcuts({
    onSubmit: _onSubmit,
    onDelete,
    onDuplicate: onDuplicateEvent,
  });

  const stopPropagation = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <EventFormShell
      {...props}
      priority={priority}
      className="text-xl"
      name={ID_SOMEDAY_EVENT_FORM}
      onClick={stopPropagation}
      onKeyDown={onKeyDown}
      onMouseDown={stopPropagation}
      onMouseUp={(e) => {
        e.stopPropagation();
      }}
    >
      <TitleActionsRow
        title={
          <Focusable
            Component="input"
            className={classNames(
              INPUT_RESET_CLASSNAME,
              "text-(length:--font-size-5xl) w-full bg-transparent font-semibold transition-all duration-300",
            )}
            autoFocus
            onChange={onChangeEventTextField("title")}
            onKeyDown={ignoreDelete}
            placeholder="Title"
            title="title"
            underlineColor={colorByPriority[priority]}
            value={title}
            withUnderline
          />
        }
        actions={
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
        }
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
        value={
          event.content.kind === "details" ? event.content.description : ""
        }
        className="relative max-h-45 w-full overflow-y-auto border-hidden bg-transparent transition-all duration-300 hover:bg-border-primary hover:brightness-90"
      />

      <SaveSection priority={priority} onSubmit={_onSubmit} />
    </EventFormShell>
  );
};
