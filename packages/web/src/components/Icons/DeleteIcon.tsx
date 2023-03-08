import React from "react";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { StyledTrashIcon } from "@web/components/Svg";

interface Props {
  onDelete: (eventId: string) => void;
  title: string;
}

export const DeleteIcon: React.FC<Props> = ({ onDelete, title }) => {
  return (
    <StyledTrashIcon
      hovercolor={getColor(ColorNames.GREY_5)}
      //@ts-ignore
      onClick={onDelete}
      role="button"
      title={title}
    />
  );
};
