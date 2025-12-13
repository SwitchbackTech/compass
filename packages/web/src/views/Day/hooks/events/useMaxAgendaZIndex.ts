import { useMetaContext } from "@web/common/hooks/useMetaContext";
import { MaxAgendaEventZIndexContext } from "@web/views/Day/context/MaxAgendaZIndexContext";

export function useMaxAgendaZIndex() {
  return useMetaContext(MaxAgendaEventZIndexContext, "useMaxAgendaZIndex");
}
