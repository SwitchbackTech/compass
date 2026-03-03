import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { Flex } from "@web/components/Flex";
import {
  AlignItems,
  FlexDirections,
  JustifyContent,
} from "@web/components/Flex/styled";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { Text } from "@web/components/Text";
import { type Props_DraftForm } from "@web/views/Calendar/components/Draft/context/DraftContext";
import { type Actions_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarActions";
import { StyledMigrateArrow } from "./styled";

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
      <Flex
        alignItems={AlignItems.CENTER}
        direction={FlexDirections.ROW}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text size="l">
          {isRecurring && (
            <RepeatIcon
              data-testid="repeat-icon"
              size={14}
              style={{ marginRight: "4px", verticalAlign: "middle" }}
            />
          )}
          {event.title}
        </Text>

        {canMigrate && (
          <Flex>
            <StyledMigrateArrow
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(event, category, "back");
              }}
              role="button"
              title={`Migrate to previous ${target}`}
            >
              {"<"}
            </StyledMigrateArrow>
            <StyledMigrateArrow
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(event, category, "forward");
              }}
              role="button"
              title={`Migrate to next ${target}`}
            >
              {">"}
            </StyledMigrateArrow>
          </Flex>
        )}
      </Flex>
    </div>
  );
};
