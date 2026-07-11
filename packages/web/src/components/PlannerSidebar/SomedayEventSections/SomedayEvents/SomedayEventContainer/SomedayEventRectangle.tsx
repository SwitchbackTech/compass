import { CaretLeft, CaretRight, DotsSixVertical } from "@phosphor-icons/react";
import { type Event } from "@core/types/event.contracts";
import { Categories_Event } from "@core/types/event.types";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { type Actions_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarActions";
import { eventToSchemaEvent } from "@web/events/queries/event.legacy-bridge";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/context/DraftContext";

const ACTIONS_CLASS_NAME =
  "pointer-events-none flex opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100";

const ACTION_BUTTON_CLASS_NAME =
  "inline-flex h-full cursor-pointer items-center px-1 text-text-lighter transition-colors duration-150 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary";

interface Props {
  category: Categories_Event;
  event: Event;
  onMigrate: Actions_Sidebar["onMigrate"];
  formProps: Props_DraftForm;
}

export const SomedayEventRectangle = ({
  category,
  event,
  formProps,
  onMigrate,
}: Props) => {
  const target = category === Categories_Event.SOMEDAY_WEEK ? "week" : "month";
  const canMigrate = event.recurrence.kind === "single";
  const title = event.content.kind === "details" ? event.content.title : "";

  return (
    <div
      className="h-full"
      ref={formProps.refs.setReference}
      {...formProps.getReferenceProps()}
    >
      <div className="flex h-full items-center justify-between">
        <div
          className="flex min-w-0 flex-1 items-center gap-1.5"
          data-someday-event-title-row="true"
        >
          <DotsSixVertical
            aria-hidden="true"
            className="shrink-0 text-text-light"
            data-someday-drag-affordance="true"
            size={14}
            weight="bold"
          />
          <span
            className="relative min-w-0 truncate text-m"
            style={{ lineHeight: "16px" }}
          >
            {title}
          </span>
        </div>

        {canMigrate ? (
          <div
            className={ACTIONS_CLASS_NAME}
            data-someday-drag-affordance="true"
          >
            <button
              aria-label={`Migrate to previous ${target}`}
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(eventToSchemaEvent(event), category, "back");
              }}
              title={`Migrate to previous ${target}`}
              type="button"
            >
              <CaretLeft aria-hidden="true" size={14} weight="bold" />
            </button>
            <button
              aria-label={`Migrate to next ${target}`}
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(eventToSchemaEvent(event), category, "forward");
              }}
              title={`Migrate to next ${target}`}
              type="button"
            >
              <CaretRight aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
        ) : (
          // Recurring someday events can't be migrated; instead of a disabled
          // migrate control with a hover warning, show a passive, muted repeat
          // indicator so the user can see the event repeats.
          <RepeatIcon
            aria-label="Recurring event"
            className="mr-1 shrink-0 text-text-light"
            role="img"
            size={14}
            weight="bold"
          />
        )}
      </div>
    </div>
  );
};
