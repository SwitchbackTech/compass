import React from "react";

export const StaticAgenda: React.FC = () => {
  const staticEvents = [
    { time: "9:00 AM", title: "Morning standup", color: "#60a5fa" },
    { time: "2:00 PM", title: "Client presentation", color: "#3459d3" },
    { time: "4:00 PM", title: "Code review", color: "#908bfa" },
    { time: "5:30 PM", title: "Team sync", color: "#60a5fa" },
  ];

  return (
    <div className="flex h-full max-w-[330px] flex-col overflow-y-auto">
      {staticEvents.map((event, index) => (
        <div key={index}>
          <div className="border-b border-[#333] px-2 py-1 font-['Rubik'] text-xs text-[hsl(47_7_73)]">
            {event.time}
          </div>
          <div
            className="my-1 rounded px-3 py-2 font-['Rubik'] text-sm text-white"
            style={{ backgroundColor: event.color }}
          >
            {event.title}
          </div>
        </div>
      ))}
    </div>
  );
};
