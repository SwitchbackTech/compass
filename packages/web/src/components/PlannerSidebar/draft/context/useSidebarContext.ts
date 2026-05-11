import * as React from "react";
import {
  SidebarDraftContext,
  type SidebarDraftContextValue,
} from "./SidebarDraftContext";

const { useContext: readContext } = React;

export function useSidebarContext(): SidebarDraftContextValue;
export function useSidebarContext(
  suppressContextError: true,
): SidebarDraftContextValue | null;
export function useSidebarContext(suppressContextError = false) {
  const context = readContext(SidebarDraftContext);
  if (!context) {
    if (suppressContextError) {
      return null;
    }
    throw new Error(
      "useSidebarContext must be used within SidebarDraftProvider",
    );
  }
  return context;
}
