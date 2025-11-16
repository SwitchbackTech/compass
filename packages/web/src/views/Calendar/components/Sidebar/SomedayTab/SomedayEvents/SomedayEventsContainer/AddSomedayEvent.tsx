import { Text } from "@web/components/Text";
import { EventPlaceholder } from "@web/views/Calendar/components/Sidebar/styled";

export const AddSomedayEvent = () => {
  return (
    <EventPlaceholder role="button">
      <Text size="l">+</Text>
    </EventPlaceholder>
  );
};
