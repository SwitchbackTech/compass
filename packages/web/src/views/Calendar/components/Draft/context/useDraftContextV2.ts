import { useContext } from "react";
import { DraftContextV2 } from "@web/views/Calendar/components/Draft/context/DraftProviderV2";

export const useDraftContextV2 = () => {
  const context = useContext(DraftContextV2);

  if (!context) {
    throw new Error("useDraftContext must be used within DraftProviderV2");
  }

  return context;
};
