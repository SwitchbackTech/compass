import React from "react";
import { AgendaContainer, AgendaEvent, AgendaTimeLabel } from "./styled";

export const StaticAgenda: React.FC = () => {
  const staticEvents = [
    { time: "9:00 AM", title: "Morning standup", color: "#60a5fa" },
    { time: "2:00 PM", title: "Client presentation", color: "#3459d3" },
    { time: "4:00 PM", title: "Code review", color: "#908bfa" },
    { time: "5:30 PM", title: "Team sync", color: "#60a5fa" },
  ];

  return (
    <AgendaContainer>
      {staticEvents.map((event, index) => (
        <div key={index}>
          <AgendaTimeLabel>{event.time}</AgendaTimeLabel>
          <AgendaEvent color={event.color}>{event.title}</AgendaEvent>
        </div>
      ))}
    </AgendaContainer>
  );
};
