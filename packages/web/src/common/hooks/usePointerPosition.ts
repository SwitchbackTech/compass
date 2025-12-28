import { PointerPositionContext } from "@web/common/context/pointer-position";
import { useMetaContext } from "@web/common/hooks/useMetaContext";

export function usePointerPosition() {
  return useMetaContext(PointerPositionContext, "usePointerPosition");
}
