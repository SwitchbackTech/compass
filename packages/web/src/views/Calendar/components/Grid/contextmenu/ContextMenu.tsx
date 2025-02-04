import React, { useState, useEffect, useRef } from "react";
import { Priorities } from "@core/constants/core.constants";
import { ContextMenuPosition } from "./GridContextMenuWrapper";

interface ContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
}

const ContextMenu = ({ position, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLUListElement>(null);
  const [selectedPriority, setSelectedPriority] = useState(
    Priorities.UNASSIGNED
  );

  // TODO: Get colors from a constant
  const priorities = [
    { id: "work", value: Priorities.WORK, color: "rgb(200, 236, 249)" },
    { id: "self", value: Priorities.SELF, color: "rgb(149, 189, 219)" },
    {
      id: "relations",
      value: Priorities.RELATIONS,
      color: "rgb(134, 208, 187)",
    },
  ];

  const actions = [
    {
      id: "edit",
      label: "✏️ Edit",
      onClick: () => alert("Edit clicked"),
    },
    {
      id: "delete",
      label: "🗑️ Delete",
      onClick: () => alert("Delete clicked"),
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <ul
      ref={menuRef}
      style={{
        position: "absolute",
        top: position?.y,
        left: position?.x,
        backgroundColor: "white",
        border: "1px solid #ccc",
        boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
        borderRadius: "8px",
        padding: "5px 0",
        listStyle: "none",
        zIndex: 1000,
        minWidth: "160px",
      }}
    >
      {/* Priority Selection */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          padding: "10px",
        }}
      >
        {priorities.map((priority) => (
          <div
            key={priority.id}
            onClick={() => setSelectedPriority(priority.value)}
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: `2px solid ${priority.color}`,
              backgroundColor:
                selectedPriority === priority.value
                  ? priority.color
                  : "transparent",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              boxShadow:
                selectedPriority === priority.value
                  ? `0px 0px 0px 0px ${priority.color}`
                  : "none",
            }}
          />
        ))}
      </div>

      {/* Edit and Delete Options */}
      {actions.map((item, i) => {
        const isLast = i === actions.length - 1;

        return (
          <li
            key={item.id}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              userSelect: "none",
              fontSize: "14px",
              color: "#333",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderBottom: !isLast ? "1px solid #eee" : "none",
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = "white";
            }}
          >
            {item.label}
          </li>
        );
      })}
    </ul>
  );
};

export default ContextMenu;
