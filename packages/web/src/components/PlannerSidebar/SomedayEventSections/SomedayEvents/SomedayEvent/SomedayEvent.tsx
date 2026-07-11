import { type KeyboardEvent, type Ref } from "react";
import { type Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { type CSSVariables } from "@web/common/styles/css.types";
import { colorByPriority } from "@web/common/styles/theme.util";
import { type Actions_Sidebar } from "@web/components/PlannerSidebar/draft/hooks/useSidebarActions";
import { type SomedayInteractionCategory } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/registry/somedayEventRegistry";
import { type Props_DraftForm } from "@web/views/Week/components/Draft/hooks/state/useDraftForm";
import { SomedayEventRectangle } from "../SomedayEventContainer/SomedayEventRectangle";
import {
  SOMEDAY_EVENT_ROW_HEIGHT,
  SOMEDAY_EVENT_ROW_VERTICAL_MARGIN,
} from "./someday-event.constants";

interface Props {
  category: SomedayInteractionCategory;
  event: Event;
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

  const tint = (percent: number) =>
    `color-mix(in srgb, ${colorByPriority[priority]} ${percent}%, transparent)`;
  const somedayEventProps = {
    [DATA_EVENT_ELEMENT_ID]: event.id,
    "aria-hidden": isDragging || undefined,
    onBlur,
    onClick,
    onFocus,
    onKeyDown: handleKeyDown,
    role: "button",
    ref: interactionRef,
    tabIndex: isDragging ? -1 : 0,
  };

  return (
    <div
      {...somedayEventProps}
      className="group w-full cursor-grab rounded-xs bg-(--someday-event-bg) px-2 py-0.75 text-text-lighter text-xs transition-[background-color_.2s,opacity_.12s,box-shadow_.2s] hover:bg-(--someday-event-hover-bg) focus-visible:outline-1 focus-visible:outline-accent-primary focus-visible:outline-offset-1 data-[dragging=true]:pointer-events-none data-[dragging=true]:cursor-grabbing data-[dragging=true]:opacity-0"
      data-dragging={isDragging}
      style={
        {
          "--someday-event-bg": tint(isDrafting ? (isDragging ? 45 : 35) : 15),
          "--someday-event-hover-bg": tint(25),
          height: SOMEDAY_EVENT_ROW_HEIGHT,
          marginBlock: SOMEDAY_EVENT_ROW_VERTICAL_MARGIN,
        } as CSSVariables
      }
    >
      <SomedayEventRectangle
        category={category}
        event={event}
        onMigrate={onMigrate}
        formProps={formProps}
      />
    </div>
  );
};
