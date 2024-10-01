import React from "react";

import { TrashIcon } from "./Trash";

interface Props {
  onDelete: () => void;
  title: string;
}

export const DeleteIcon: React.FC<Props> = ({ onDelete, title }) => {
  return <TrashIcon onClick={onDelete} role="button" name={title} size={27} />;
};
