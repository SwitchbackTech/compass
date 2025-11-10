import React from "react";
import { Play, Stop } from "@phosphor-icons/react";
import { Schema_WebEvent } from "@web/common/types/web.event.types";

export interface FocusedEventProps {
  event?: Schema_WebEvent | null;
  countdown?: string;
  start?: () => void;
  end?: () => void;
  timeLeft?: string;
}

export const FocusedEvent: React.FC<FocusedEventProps> = ({
  event,
  countdown,
  start,
  end,
  timeLeft,
}) => {
  if (!event) {
    return null;
  }

  const isRunning = !!countdown;
  const buttonText = isRunning ? "Stop" : "Start";
  const handleButtonClick = isRunning ? end : start;

  // Format dates for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Determine countdown color based on time urgency
  const getCountdownColor = () => {
    if (!countdown) return "text-gray-400";

    const [hours, minutes, seconds] = countdown.split(":").map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    if (totalSeconds < 300) return "text-red-400"; // Less than 5 minutes
    if (totalSeconds < 900) return "text-yellow-400"; // Less than 15 minutes
    return "text-green-400"; // More than 15 minutes
  };

  return (
    <div
      className="fixed top-24 right-3 z-30 mx-3 w-full max-w-md rounded-lg border border-white/20 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-sm sm:right-6 sm:mx-0 sm:p-6 md:max-w-lg"
      role="article"
      aria-label="Focused event"
    >
      {/* Event Title */}
      <h2 className="mb-3 text-xl font-bold text-white sm:text-2xl">
        {event.title || "Untitled Event"}
      </h2>

      {/* Event Times */}
      <div className="mb-4 flex flex-col gap-1 text-xs text-gray-300 sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-400">Start:</span>
          <span>{formatDate(event.startDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-400">End:</span>
          <span>{formatDate(event.endDate)}</span>
        </div>
      </div>

      {/* Event Description */}
      {event.description && (
        <div className="mb-4 rounded-md bg-slate-800/50 p-3">
          <p className="text-xs text-gray-300 sm:text-sm">
            {event.description}
          </p>
        </div>
      )}

      {/* Timer Display */}
      <div className="mb-4 flex items-center justify-between gap-4">
        {/* Countdown Timer */}
        {isRunning && countdown && (
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-gray-400">Elapsed</span>
            <span
              className={`text-2xl font-bold sm:text-3xl ${getCountdownColor()}`}
            >
              {countdown}
            </span>
          </div>
        )}

        {/* Time Remaining */}
        {isRunning && timeLeft && (
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-gray-400">Remaining</span>
            <span className="text-base font-semibold text-cyan-400 sm:text-lg">
              {timeLeft}
            </span>
          </div>
        )}
      </div>

      {/* Start/Stop Button */}
      <button
        onClick={handleButtonClick}
        className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 sm:px-6 sm:py-3 sm:text-base ${
          isRunning
            ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
            : "bg-green-600 hover:bg-green-700 active:bg-green-800"
        }`}
        aria-label={buttonText}
      >
        {isRunning ? (
          <Stop size={20} weight="fill" />
        ) : (
          <Play size={20} weight="fill" />
        )}
        <span>{buttonText}</span>
      </button>
    </div>
  );
};
