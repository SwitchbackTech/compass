import React from "react";
import { getColor } from "@web/common/utils/colors";
import { ColorNames } from "@web/common/types/styles";
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
