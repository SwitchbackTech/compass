import React, { FC } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { DraggableSomedayEvent } from "../../Sidebar/SomedayTab/SomedayEvents/Wrappers/DraggableSomedayEvent";
import { ID_SOMEDAY_DRAFT } from "@web/common/constants/web.constants";

interface Props {
  category: Categories_Event;
  draft: Schema_Event;
  index: number;
  isOverGrid: boolean;
}

export const SomedayDraft: FC<Props> = ({
  category,
  draft,
  index,
  isOverGrid,
}) => {
  console.log(draft);
  return (
    <DraggableSomedayEvent
      category={category}
      draftId={ID_SOMEDAY_DRAFT}
      event={draft}
      index={index}
      isDrafting={true}
      isOverGrid={isOverGrid}
      key={ID_SOMEDAY_DRAFT}
    />
  );
};
