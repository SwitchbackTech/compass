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
    Array.isArray(rule) || typeof recurrenceEventId === "string";
  const canMigrate = !isRecurring;

  return (
    <div ref={formProps.refs.setReference} {...formProps.getReferenceProps()}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-l min-w-0 leading-tight">
          <span className="inline-flex items-center gap-1 align-top">
            {isRecurring && (
              <RepeatIcon
                aria-label="Recurring event"
                size={14}
                className="shrink-0"
              />
            )}
            <span className="truncate">{event.title}</span>
          </span>
        </div>

        {canMigrate ? (
          <div className="flex items-center">
            <span
              className="hover:bg-bg-primary hover:text-text-lighter cursor-pointer px-[7px] transition-colors duration-300 select-none hover:rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(event, category, "back");
              }}
              role="button"
              title={`Migrate to previous ${target}`}
            >
              {"<"}
            </span>
            <span
              className="hover:bg-bg-primary hover:text-text-lighter cursor-pointer px-[7px] transition-colors duration-300 select-none hover:rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(event, category, "forward");
              }}
              role="button"
              title={`Migrate to next ${target}`}
            >
              {">"}
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            <span
              className="cursor-not-allowed rounded-[2px] border border-transparent px-1 py-0.5 text-[10px] opacity-50 transition-opacity duration-200 hover:opacity-70"
              onClick={(e) => {
                e.stopPropagation();
                alert("Can't migrate recurring events");
              }}
              title="Can't migrate recurring events"
            >
              ☝️
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
