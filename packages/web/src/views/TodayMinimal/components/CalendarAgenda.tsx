import React, { useEffect, useRef, useState } from "react";
import { useTodayMinimal } from "../context/TodayMinimalProvider";
import { useCalendarEventKeyboard } from "../hooks/useCalendarEventKeyboard";
import { useContextMenu } from "../hooks/useContextMenu";
import { TimeBlock } from "../types";

export function CalendarAgenda() {
  const {
    timeBlocks,
    currentTime,
    addTimeBlock,
    updateTimeBlockTitle,
    updateTimeBlockPriority,
    deleteTimeBlock,
  } = useTodayMinimal();
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [focusedEventPart, setFocusedEventPart] = useState<
    "start" | "block" | "end" | null
  >(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const nowMarkerRef = useRef<HTMLDivElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const calendarSurfaceRef = useRef<HTMLDivElement>(null);
  const suppressNextCreateRef = useRef(false);

  // Context menu hook
  const {
    contextMenu,
    showContextMenu,
    hideContextMenu,
    isOpen: isContextMenuOpen,
  } = useContextMenu({
    actions: {
      onRename: (eventId: string) => {
        setEditingEventId(eventId);
      },
      onSetPriority: (
        eventId: string,
        priority: "Work" | "Self" | "Relationships",
      ) => {
        updateTimeBlockPriority(eventId, priority);
      },
      onDelete: (eventId: string) => {
        deleteTimeBlock(eventId);
      },
    },
  });

  // Calendar event keyboard shortcuts hook
  useCalendarEventKeyboard({
    timeBlocks,
    focusedEventId,
    focusedEventPart,
    calendarScrollRef,
    actions: {
      setFocusedTaskId,
      setFocusedEventId,
      setFocusedEventPart,
    },
  });

  // Center the calendar around the current time when the view mounts
  useEffect(() => {
    try {
      nowMarkerRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    } catch {
      // Ignore if scrollIntoView fails
    }
  }, []);

  // Format time for display
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;
  };

  // Get position in pixels for a given time (15-minute slots, 20px each)
  const getTimePosition = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const slot = hours * 4 + Math.floor(minutes / 15);
    return slot * 20;
  };

  // Get position for time string (HH:MM format)
  const getTimePositionFromString = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const slot = hours * 4 + Math.floor(minutes / 15);
    return slot * 20;
  };

  const getPriorityColor = (priority?: TimeBlock["priority"]) => {
    switch (priority) {
      case "Work":
        return "bg-blue-500 text-white";
      case "Self":
        return "bg-green-500 text-white";
      case "Relationships":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-600 text-gray-300";
    }
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    if (suppressNextCreateRef.current) {
      suppressNextCreateRef.current = false;
      return;
    }

    // Ignore clicks on existing event blocks
    const target = e.target as HTMLElement;
    if (target.closest('[data-calendar-event="true"]')) return;

    const surface = e.currentTarget as HTMLDivElement;
    const rect = surface.getBoundingClientRect();

    // Compute y-offset within the surface's padding box
    const paddingTop =
      parseFloat(getComputedStyle(surface).paddingTop || "0") || 0;
    const y = e.clientY - rect.top - paddingTop;

    // If there is an active draft with empty title, discard and do not create a new event
    if (editingEventId) {
      const draft = timeBlocks.find((b) => b.id === editingEventId);
      if (draft && !draft.title.trim()) {
        deleteTimeBlock(draft.id);
        setEditingEventId(null);
        return;
      }
    }

    const slot = Math.max(0, Math.min(95, Math.floor(y / 20)));
    const startHour = Math.floor(slot / 4);
    const startMinute = (slot % 4) * 15;
    const endSlot = Math.min(96, slot + 2);
    const endHour = Math.floor(endSlot / 4);
    const endMinute = (endSlot % 4) * 15;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const startTime = `${pad(startHour)}:${pad(startMinute)}`;
    const endTime = `${pad(endHour)}:${pad(endMinute)}`;

    const block = addTimeBlock(startTime, endTime);
    setEditingEventId(block.id);
  };

  return (
    <div className="flex h-full flex-col bg-darkBlue-400">
      <div
        ref={calendarScrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative flex"
        data-testid="calendar-scroll"
        style={{
          overscrollBehavior: "contain",
          scrollbarGutter: "stable both-edges",
        }}
      >
        {/* Time labels column */}
        <div className="w-16 flex-shrink-0 relative bg-darkBlue-400">
          {Array.from({ length: 96 }, (_, i) => {
            const hour = Math.floor(i / 4);
            const minute = (i % 4) * 15;
            const displayTime =
              minute === 0
                ? `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${
                    hour < 12 ? "am" : "pm"
                  }`
                : "";

            return (
              <div
                key={`time-${i}`}
                className="absolute z-20 text-xs text-gray-200 flex items-center pointer-events-none"
                style={{
                  top: `${i * 20}px`,
                  left: "0px",
                  height: "20px",
                  width: "64px",
                }}
              >
                {displayTime && (
                  <span className="w-full pr-2 bg-darkBlue-400 text-right">
                    {displayTime}
                  </span>
                )}
              </div>
            );
          })}

          {/* Current time indicator for time column */}
          <div
            ref={nowMarkerRef}
            data-now-marker="true"
            className="absolute left-0 right-0 border-t-2 border-red z-30"
            style={{
              top: `${(currentTime.getHours() * 4 + Math.floor(currentTime.getMinutes() / 15)) * 20}px`,
            }}
          >
            <div className="absolute -left-2 -top-1 w-4 h-2 bg-red rounded-full"></div>
            <div className="absolute left-0 -top-2 w-16 z-20 text-[11px] leading-none text-red font-medium bg-darkBlue-400/90 px-1 rounded-sm pointer-events-none shadow-sm">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>

        {/* Events column */}
        <div className="flex-1 relative ml-1">
          <div
            ref={calendarSurfaceRef}
            data-testid="calendar-surface"
            onClick={handleCalendarClick}
            style={{ height: `${24 * 4 * 20}px`, position: "relative" }}
          >
            {/* Current time indicator for events column */}
            <div
              className="absolute left-0 right-0 border-t-2 border-red z-30"
              style={{
                top: `${(currentTime.getHours() * 4 + Math.floor(currentTime.getMinutes() / 15)) * 20}px`,
              }}
            />

            {/* Time blocks */}
            <div className="relative">
              {timeBlocks.map((block) => {
                const startPosition = getTimePositionFromString(
                  block.startTime,
                );
                const endPosition = getTimePositionFromString(block.endTime);
                const blockHeight = endPosition - startPosition;
                const GAP_PX = 2;
                const renderedHeight = Math.max(4, blockHeight - GAP_PX);

                const now = new Date();
                const nowStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
                const isPast = block.endTime < nowStr;
                const isFocused = focusedEventId === block.id;
                const isShort = renderedHeight < 22;

                return (
                  <div key={block.id}>
                    {/* Event block */}
                    <div
                      data-calendar-event="true"
                      data-event-id={block.id}
                      data-event-part="block"
                      data-focused={isFocused ? "true" : undefined}
                      tabIndex={-1}
                      className={`left-2 right-2 rounded pl-2 pr-10 text-xs flex items-center justify-between cursor-pointer group relative z-10 border-2 border-transparent ${
                        isPast ? "opacity-60" : ""
                      } ${getPriorityColor(block.priority)} ${
                        isFocused && focusedEventPart === "block"
                          ? "border-yellow-300"
                          : ""
                      }`}
                      style={{
                        height: `${renderedHeight}px`,
                        top: `${startPosition}px`,
                      }}
                      onClick={(e) => {
                        if ((e as any).detail && (e as any).detail > 1) return; // ignore double-clicks
                        if (editingEventId === block.id) return;
                        try {
                          (e.currentTarget as HTMLElement).focus();
                        } catch {}
                        setFocusedTaskId(null);
                        setFocusedEventId(block.id);
                        setFocusedEventPart("block");
                      }}
                      onFocus={(e) => {
                        if (e.currentTarget === (e.target as HTMLElement)) {
                          setFocusedTaskId(null);
                          setFocusedEventId(block.id);
                          setFocusedEventPart("block");
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        showContextMenu(e.clientX, e.clientY, block.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingEventId(block.id);
                      }}
                    >
                      {/* Focus area: start */}
                      <span
                        data-calendar-event="true"
                        data-event-id={block.id}
                        data-event-part="start"
                        tabIndex={0}
                        aria-label={`${block.title || "Event"} start time`}
                        className="sr-only"
                        onFocus={() => {
                          setFocusedTaskId(null);
                          setFocusedEventId(block.id);
                          setFocusedEventPart("start");
                        }}
                      />

                      {/* Hover time chip */}
                      <div
                        data-testid="event-time-chip"
                        aria-hidden
                        className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white/90 border border-white/20 rounded ${
                          isShort
                            ? "text-[9px] px-1 py-0"
                            : "text-[10px] px-1.5 py-0.5"
                        } opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none`}
                      >
                        {`${block.startTime}–${block.endTime}`}
                      </div>

                      {editingEventId === block.id ? (
                        <input
                          data-testid="event-title-input"
                          aria-label="Event title"
                          className="flex-1 bg-transparent text-white placeholder-gray-300 border-0 outline-none px-1 py-0.5 text-xs focus:ring-0"
                          placeholder="Event title"
                          value={block.title}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            updateTimeBlockTitle(block.id, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.preventDefault();
                              if (!block.title.trim()) {
                                deleteTimeBlock(block.id);
                              }
                              setEditingEventId(null);
                            } else if (e.key === "Enter") {
                              setEditingEventId(null);
                            }
                          }}
                          onBlur={() => {
                            if (!block.title.trim()) {
                              suppressNextCreateRef.current = true;
                              deleteTimeBlock(block.id);
                            }
                            setEditingEventId(null);
                          }}
                        />
                      ) : (
                        <span className="truncate flex-1">
                          {block.title || "Untitled"}
                        </span>
                      )}

                      {/* Focus area: end */}
                      <span
                        data-calendar-event="true"
                        data-event-id={block.id}
                        data-event-part="end"
                        tabIndex={0}
                        aria-label={`${block.title || "Event"} end time`}
                        className="sr-only"
                        onFocus={() => {
                          setFocusedTaskId(null);
                          setFocusedEventId(block.id);
                          setFocusedEventPart("end");
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {isContextMenuOpen && contextMenu && (
        <div
          data-testid="event-context-menu"
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-2 min-w-[200px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            onClick={() => {
              setEditingEventId(contextMenu.eventId);
              hideContextMenu();
            }}
          >
            <span>✏️</span>
            <span>Rename (E)</span>
          </button>
          <div className="border-t border-gray-600 my-1"></div>
          <button
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            onClick={() => {
              updateTimeBlockPriority(contextMenu.eventId, "Work");
              hideContextMenu();
            }}
          >
            <span>💼</span>
            <span>Work (W)</span>
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            onClick={() => {
              updateTimeBlockPriority(contextMenu.eventId, "Self");
              hideContextMenu();
            }}
          >
            <span>🧘</span>
            <span>Self (S)</span>
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
            onClick={() => {
              updateTimeBlockPriority(contextMenu.eventId, "Relationships");
              hideContextMenu();
            }}
          >
            <span>👥</span>
            <span>Relationships (R)</span>
          </button>
          <div className="border-t border-gray-600 my-1"></div>
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
            onClick={() => {
              deleteTimeBlock(contextMenu.eventId);
              hideContextMenu();
            }}
          >
            <span>🗑️</span>
            <span>Delete (Del)</span>
          </button>
        </div>
      )}
    </div>
  );
}
