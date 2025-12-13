import { useContext } from "react";
import { DateNavigationContext } from "../../context/DateNavigationContext";

export function useDateNavigation() {
  const context = useContext(DateNavigationContext);
  if (!context) {
    throw new Error(
      "useDateNavigation must be used within DateNavigationProvider",
    );
  }
  return context;
}
