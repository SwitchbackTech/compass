import React from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Flex } from "@web/components/Flex";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { FlexDirections } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { Actions_Sidebar } from "../../../../../Draft/sidebar/hooks/useSidebarActions";
import { StyledMigrateArrow, StyledRecurrenceText } from "./styled";

interface Props {
  category: Categories_Event;
  event: Schema_Event;
  onMigrate: Actions_Sidebar["onMigrate"];
}

export const SomedayEventRectangle = ({
  category,
  event,
  onMigrate,
}: Props) => {
  const target = category === Categories_Event.SOMEDAY_WEEK ? "week" : "month";
  const canMigrate =
    !event.recurrence?.rule || event.recurrence?.rule.length === 0;

  return (
    <>
      <Flex
        alignItems={AlignItems.CENTER}
        direction={FlexDirections.ROW}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text size="l">{event.title}</Text>

        {canMigrate ? (
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
        ) : (
          <Flex>
            <StyledRecurrenceText
              onClick={(e) => {
                e.stopPropagation();
                alert("Can't migrate recurring events");
              }}
              title="Can't migrate recurring events"
            >
              ☝️
            </StyledRecurrenceText>
          </Flex>
        )}
      </Flex>
    </>
  );
};
