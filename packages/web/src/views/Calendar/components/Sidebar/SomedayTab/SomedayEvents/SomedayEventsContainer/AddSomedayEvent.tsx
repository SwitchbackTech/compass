import { Text } from "@web/components/Text";
import { EventPlaceholder } from "@web/views/Calendar/components/Sidebar/styled";

export const AddSomedayEvent = ({ onKeyDown }: { onKeyDown: () => void }) => {
  return (
    <EventPlaceholder
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onKeyDown();
        }
      }}
    >
      <Text size="l">+</Text>
    </EventPlaceholder>
  );
};
