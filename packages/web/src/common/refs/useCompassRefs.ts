import { useMetaContext } from "@web/common/hooks/useMetaContext";
import { CompassRefsContext } from "@web/common/refs/compass-refs";

export function useCompassRefs() {
  return useMetaContext(CompassRefsContext, "useCompassRefs");
}
