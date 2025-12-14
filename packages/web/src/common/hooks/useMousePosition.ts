import { MousePositionContext } from "@web/common/context/mouse-position";
import { useMetaContext } from "@web/common/hooks/useMetaContext";

export function useMousePosition() {
  return useMetaContext(MousePositionContext, "useMousePosition");
}
