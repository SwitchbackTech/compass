import React, { ReactNode, useState, useRef } from "react";
import ContextMenu from "./ContextMenu";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

const GridContextMenuWrapper = ({ children }: { children: ReactNode }) => {
  const [contextMenuPos, setContextMenuPos] =
    useState<ContextMenuPosition | null>(null);
  null;
  const wrapperRef = useRef(null);

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setContextMenuPos({
      x: event.pageX,
      y: event.pageY,
    });
  };

  const closeMenu = () => {
    setContextMenuPos(null);
  };

  return (
    <div
      ref={wrapperRef}
      style={{ display: "contents" }}
      onContextMenu={handleContextMenu}
    >
      {children}
      {contextMenuPos && (
        <ContextMenu
          position={{ x: contextMenuPos.x, y: contextMenuPos.y }}
          onClose={closeMenu}
        />
      )}
    </div>
  );
};
export default GridContextMenuWrapper;
