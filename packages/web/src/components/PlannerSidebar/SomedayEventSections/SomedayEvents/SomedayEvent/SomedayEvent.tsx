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
  interactionRef,
  formProps,
}: Props) => {
  const { isDrafting, isDragging } = status;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.target !== event.currentTarget ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    event.preventDefault();
    onClick();
  };

  const somedayEventProps = {
    [DATA_EVENT_ELEMENT_ID]: event._id,
    "aria-hidden": isDragging || undefined,
    isDragging,
    isDrafting,
    onBlur,
    onClick,
    onFocus,
    onKeyDown: handleKeyDown,
    priority,
    role: "button",
    ref: interactionRef,
    tabIndex: isDragging ? -1 : 0,
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
