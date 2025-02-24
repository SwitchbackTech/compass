import React from "react";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import { Priorities } from "@core/constants/core.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { Props_DraftForm } from "@web/views/Calendar/components/Draft/hooks/state/useDraftForm";
import { Actions_Sidebar } from "@web/views/Calendar/components/Draft/sidebar/hooks/useSidebarActions";
import { SomedayEventRectangle } from "../SomedayEventContainer/SomedayEventRectangle";
import { StyledNewSomedayEvent, getStyle } from "./styled";

interface Props {
  category: Categories_Event;
  event: Schema_Event;
  isDrafting: boolean;
  isDragging: boolean;
  isOverGrid: boolean;
  isFocused: boolean;
  onBlur: () => void;
  onClick: () => void;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onMigrate: Actions_Sidebar["onMigrate"];
  priority: Priorities;
  provided: DraggableProvided;
  formProps: Props_DraftForm;
  snapshot: DraggableStateSnapshot;
}
export const SomedayEvent = ({
  category,
  event,
  isDrafting,
  isDragging,
  isOverGrid,
  isFocused,
  onBlur,
  onClick,
  onFocus,
  onKeyDown,
  onMigrate,
  priority,
  provided,
  formProps,
  snapshot,
}: Props) => {
  const style = getStyle(snapshot, isOverGrid, provided.draggableProps.style);

  return (
    <StyledNewSomedayEvent
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={style}
      isDragging={isDragging}
      isDrafting={isDrafting}
      isOverGrid={isOverGrid}
      isFocused={isFocused}
      onBlur={onBlur}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      priority={priority}
      role="button"
      ref={provided.innerRef}
    >
      <SomedayEventRectangle
        category={category}
        event={event}
        onMigrate={onMigrate}
        formProps={formProps}
      />
    </StyledNewSomedayEvent>
  );
};
