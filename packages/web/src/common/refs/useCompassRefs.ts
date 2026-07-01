import { useContext } from "react";
import { CompassRefsContext } from "@web/common/refs/compass-refs";

export function useCompassRefs() {
  const compassRefs = useContext(CompassRefsContext);

  if (compassRefs === null) {
    throw new Error(
      "useCompassRefs must be used within CompassRefsProvider and be defined.",
    );
  }

  return compassRefs;
}
