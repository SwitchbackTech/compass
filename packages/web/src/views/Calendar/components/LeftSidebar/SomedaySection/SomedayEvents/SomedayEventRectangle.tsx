import React from "react";
import { Schema_Event } from "@core/types/event.types";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { FlexDirections } from "@web/components/Flex/styled";
import { Flex } from "@web/components/Flex";
import { Text } from "@web/components/Text";

import { StyledMigrateArrow } from "./styled";

interface Props {
  event: Schema_Event;
  onMigrate: (event: Schema_Event, location: "forward" | "back") => void;
}

export const SomedayEventRectangle = ({ event, onMigrate }: Props) => {
  return (
    <>
      <Flex
        alignItems={AlignItems.CENTER}
        direction={FlexDirections.ROW}
        justifyContent={JustifyContent.SPACE_BETWEEN}
      >
        <Text size={15}>{event.title}</Text>

        <Flex>
          <StyledMigrateArrow
            onClick={(e) => {
              e.stopPropagation();
              onMigrate(event, "back");
            }}
            role="button"
            title="Migrate to previous week"
          >
            {"<"}
          </StyledMigrateArrow>
          <StyledMigrateArrow
            onClick={(e) => {
              e.stopPropagation();
              onMigrate(event, "forward");
            }}
            role="button"
            title="Migrate to next week"
          >
            {">"}
          </StyledMigrateArrow>
        </Flex>
      </Flex>
    </>
  );
};
