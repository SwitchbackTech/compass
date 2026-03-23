import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { type Props_DraftForm } from "@web/views/Calendar/components/Draft/context/DraftContext";
import { type Actions_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarActions";

interface Props {
  category: Categories_Event;
  event: Schema_Event;
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
  const rule = event.recurrence?.rule;
  const recurrenceEventId = event.recurrence?.eventId;
  const isRecurring =
    (Array.isArray(rule) && rule.length > 0) ||
    typeof recurrenceEventId === "string";
  const canMigrate = !isRecurring;

  return (
    <div ref={formProps.refs.setReference} {...formProps.getReferenceProps()}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {isRecurring && (
            <RepeatIcon
              aria-label="Recurring event"
              size={14}
              className="shrink-0"
            />
          )}
          <span className="text-l truncate leading-tight">{event.title}</span>
        </div>

        {canMigrate ? (
          <div className="flex items-center">
            <button
              aria-label={`Migrate to previous ${target}`}
              className="hover:bg-bg-primary hover:text-text-lighter cursor-pointer px-[7px] transition-colors duration-300 select-none hover:rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(event, category, "back");
              }}
              onKeyDown={(e) => e.stopPropagation()}
              title={`Migrate to previous ${target}`}
              type="button"
            >
              {"<"}
            </button>
            <button
              aria-label={`Migrate to next ${target}`}
              className="hover:bg-bg-primary hover:text-text-lighter cursor-pointer px-[7px] transition-colors duration-300 select-none hover:rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(event, category, "forward");
              }}
              onKeyDown={(e) => e.stopPropagation()}
              title={`Migrate to next ${target}`}
              type="button"
            >
              {">"}
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            <button
              aria-label="Can't migrate recurring events"
              className="cursor-not-allowed rounded-[2px] border border-transparent px-1 py-0.5 text-[10px] opacity-50"
              disabled
              title="Can't migrate recurring events"
              type="button"
            >
              ☝️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
