import {
  type DraggableProvided,
  type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { type KeyboardEvent } from "react";
import { type Priorities } from "@core/constants/core.constants";
import {
  type Categories_Event,
  type Schema_Event,
} from "@core/types/event.types";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { getDraggableStyle } from "@web/components/DND/draggable-style.util";
import { type Actions_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarActions";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/hooks/state/useDraftForm";
import { SomedayEventRectangle } from "../SomedayEventContainer/SomedayEventRectangle";
import { StyledNewSomedayEvent } from "./styled";

interface Props {
  category: Categories_Event;
  event: Schema_Event;
  status: {
    isDrafting: boolean;
    isDragging: boolean;
    isOverGrid: boolean;
  };
  onBlur: () => void;
  onClick: () => void;
  onFocus: () => void;
  onMigrate: Actions_Sidebar["onMigrate"];
  priority: Priorities;
  provided: DraggableProvided;
  formProps: Props_DraftForm;
  snapshot: DraggableStateSnapshot;
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
  provided,
  formProps,
  snapshot,
}: Props) => {
  const { isDrafting, isDragging, isOverGrid } = status;
  const style = getDraggableStyle(
    snapshot,
    isOverGrid,
    provided.draggableProps.style,
  );
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onClick();
  };

  const somedayEventProps = {
    [DATA_EVENT_ELEMENT_ID]: event._id,
    ...provided.draggableProps,
    ...provided.dragHandleProps,
    style,
    isDragging,
    isDrafting,
    isOverGrid,
    onBlur,
    onClick,
    onFocus,
    onKeyDown: handleKeyDown,
    priority,
    role: "button",
    ref: provided.innerRef,
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
