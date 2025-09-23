import React from "react";
import { ActionsMenu } from "../ActionsMenu/ActionsMenu";
import { DeleteMenuButton } from "./DeleteMenuButton";
import { DuplicateMenuButton } from "./DuplicateMenuButton";
import { MoveToSidebarMenuButton } from "./MoveToSidebarMenuButton";

interface Props {
  bgColor: string;
  isDraft: boolean;
  onConvert?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const EventActionMenu: React.FC<Props> = ({
  bgColor,
  isDraft,
  onConvert,
  onDuplicate,
  onDelete,
}) => {
  return (
    <ActionsMenu bgColor={bgColor}>
      {(close) => (
        <>
          {!isDraft && (
            <MoveToSidebarMenuButton
              onClick={() => {
                onConvert?.();
                close();
              }}
              bgColor={bgColor}
            />
          )}
          <DuplicateMenuButton
            bgColor={bgColor}
            onClick={() => {
              onDuplicate();
              close();
            }}
          />
          <DeleteMenuButton
            bgColor={bgColor}
            onClick={() => {
              onDelete();
              close();
            }}
          />
        </>
      )}
    </ActionsMenu>
  );
};
