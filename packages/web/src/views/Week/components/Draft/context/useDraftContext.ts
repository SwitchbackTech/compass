import { useContext } from "react";
import { DraftContext } from "./DraftContext";

export const useDraftContext = () => {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error("useDraftContext must be used within DraftProvider");
  }
  return context;
};
