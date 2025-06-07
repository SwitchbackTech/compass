import React from "react";
import { toast } from "react-toastify";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { customToast } from "@web/common/utils/toast";
import { Flex } from "@web/components/Flex";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { FlexDirections } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { Props_DraftForm } from "@web/views/Calendar/components/Draft/context/DraftContext";
import { Actions_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarActions";
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
                customToast("Can't migrate recurring events");
              }}
              title="Can't migrate recurring events"
            >
              ☝️
            </StyledRecurrenceText>
          </Flex>
        )}
      </Flex>
    </div>
  );
};
