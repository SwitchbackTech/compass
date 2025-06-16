import React from "react";
import { Text } from "@web/components/Text";
import { EventPlaceholder } from "@web/views/Calendar/components/Sidebar/styled";

export const AddSomedayEvent = () => {
  return (
    <EventPlaceholder>
      <Text size="l">+</Text>
    </EventPlaceholder>
  );
};
