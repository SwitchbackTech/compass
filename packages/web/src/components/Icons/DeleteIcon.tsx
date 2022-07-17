import React from "react";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/constants/colors";
import { StyledTrashIcon } from "@web/components/Svg";

interface Props {
  onDelete: (eventId: string) => void;
  title: string;
}

export const DeleteIcon: React.FC<Props> = ({ onDelete, title }) => {
  return (
    <div onClick={onDelete} role="button" title={title}>
      <StyledTrashIcon hovercolor={getColor(ColorNames.DARK_5)} />
    </div>
  );
};
