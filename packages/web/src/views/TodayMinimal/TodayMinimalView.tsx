import React from "react";
import { TodayMinimalContent } from "./TodayMinimalContent";
import { TodayMinimalProvider } from "./context/TodayMinimalProvider";

export function TodayMinimalView() {
  return (
    <TodayMinimalProvider>
      <div className="h-screen overflow-hidden">
        <TodayMinimalContent />
      </div>
    </TodayMinimalProvider>
  );
}
