import { CompassRefsContext } from "@web/common/context/compass-refs";
import { useMetaContext } from "@web/common/hooks/useMetaContext";

export function useCompassRefs() {
  return useMetaContext(CompassRefsContext, "useCompassRefs");
}
