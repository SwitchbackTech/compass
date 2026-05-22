import {
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  DotsSixVertical,
} from "@phosphor-icons/react";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { Flex } from "@web/components/Flex";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { type Actions_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarActions";
import { Text } from "@web/components/Text";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/context/DraftContext";

const ACTIONS_CLASS_NAME =
  "pointer-events-none flex opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100";

const ACTION_BUTTON_CLASS_NAME =
  "inline-flex h-full cursor-pointer items-center px-1 text-text-lighter transition-colors duration-150 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary";

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
  const canMigrate =
    !event.recurrence?.rule || event.recurrence?.rule.length === 0;

  return (
    <div
      className="h-full"
      ref={formProps.refs.setReference}
      {...formProps.getReferenceProps()}
    >
      <Flex
        alignItems={AlignItems.CENTER}
        className="h-full"
        direction={FlexDirections.ROW}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
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
          <Text className="min-w-0 truncate" lineHeight={16} size="m">
            {event.title}
          </Text>
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
                onMigrate(event, category, "back");
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
                onMigrate(event, category, "forward");
              }}
              title={`Migrate to next ${target}`}
              type="button"
            >
              <CaretRight aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
        ) : (
          <div
            className={ACTIONS_CLASS_NAME}
            data-someday-drag-affordance="true"
          >
            <button
              aria-label="Recurring events cannot be migrated"
              className={ACTION_BUTTON_CLASS_NAME}
              onClick={(e) => {
                e.stopPropagation();
                alert("Can't migrate recurring events");
              }}
              title="Can't migrate recurring events"
              type="button"
            >
              <ArrowCounterClockwise
                aria-hidden="true"
                size={14}
                weight="bold"
              />
            </button>
          </div>
        )}
      </Flex>
    </div>
  );
};
