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
import { StyledMigrateArrow, StyledRecurrenceText } from "./styled";

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
    <div ref={formProps.refs.setReference} {...formProps.getReferenceProps()}>
      <Flex
        alignItems={AlignItems.CENTER}
        direction={FlexDirections.ROW}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text size="l">{event.title}</Text>

        {canMigrate ? (
          <Flex>
            <StyledMigrateArrow
              aria-label={`Migrate to previous ${target}`}
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(event, category, "back");
              }}
              title={`Migrate to previous ${target}`}
            >
              {"<"}
            </StyledMigrateArrow>
            <StyledMigrateArrow
              aria-label={`Migrate to next ${target}`}
              onClick={(e) => {
                e.stopPropagation();
                onMigrate(event, category, "forward");
              }}
              title={`Migrate to next ${target}`}
            >
              {">"}
            </StyledMigrateArrow>
          </Flex>
        ) : (
          <Flex>
            <StyledRecurrenceText
              aria-label="Recurring events cannot be migrated"
              onClick={(e) => {
                e.stopPropagation();
                alert("Can't migrate recurring events");
              }}
              title="Can't migrate recurring events"
            >
              R
            </StyledRecurrenceText>
          </Flex>
        )}
      </Flex>
    </div>
  );
};
