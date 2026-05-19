import { type KeyboardEvent, type Ref } from "react";
import { type Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { type Actions_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarActions";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/hooks/state/useDraftForm";
import { SomedayEventRectangle } from "../SomedayEventContainer/SomedayEventRectangle";
import { StyledNewSomedayEvent } from "./styled";

interface Props {
  category: SomedayInteractionCategory;
  event: Schema_Event;
  status: {
    isDrafting: boolean;
    isDragging: boolean;
  };
  onBlur: () => void;
  onClick: () => void;
  onFocus: () => void;
  onMigrate: Actions_Sidebar["onMigrate"];
  priority: Priorities;
  interactionAttributes: Record<string, string>;
  interactionRef: Ref<HTMLDivElement>;
  formProps: Props_DraftForm;
}
export const SomedayEvent = ({
  category,
  event,
  status,
  onBlur,
  onClick,
  onFocus,
  onMigrate,
  priority,
  interactionAttributes,
  interactionRef,
  formProps,
}: Props) => {
  const { isDrafting, isDragging } = status;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onClick();
  };

  const somedayEventProps = {
    [DATA_EVENT_ELEMENT_ID]: event._id,
    ...interactionAttributes,
    isDragging,
    isDrafting,
    onBlur,
    onClick,
    onFocus,
    onKeyDown: handleKeyDown,
    priority,
    role: "button",
    ref: interactionRef,
    tabIndex: 0,
  };

  return (
    <StyledNewSomedayEvent {...somedayEventProps} className="group">
      <SomedayEventRectangle
        category={category}
        event={event}
        onMigrate={onMigrate}
        formProps={formProps}
      />
    </StyledNewSomedayEvent>
  );
};
