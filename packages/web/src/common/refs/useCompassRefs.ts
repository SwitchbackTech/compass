import { CompassRefsContext } from "@web/common/refs/compass-refs";
import { useMetaContext } from "@web/common/refs/useMetaContext";

export function useCompassRefs() {
  return useMetaContext(CompassRefsContext, "useCompassRefs");
}
