import { useContext } from "react";
import { NowViewContext } from "../context/NowViewProvider";

export function useNowActions() {
  const context = useContext(NowViewContext);
  if (!context) {
    throw new Error("useNowView must be used within NowViewProvider");
  }
  return context;
}
