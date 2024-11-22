import React from "react";
import styled from "styled-components";
import { Trash } from "@phosphor-icons/react";

export const TrashIcon = styled(Trash)`
  transition: filter 0.2s ease;
  &:hover {
    cursor: pointer;
    filter: brightness(50%);
  }
`;

interface Props {
  onDelete: () => void;
  title: string;
}

export const DeleteIcon: React.FC<Props> = ({ onDelete, title }) => {
  return (
    <TrashIcon onClick={onDelete} role="button" aria-label={title} size={27} />
  );
};
