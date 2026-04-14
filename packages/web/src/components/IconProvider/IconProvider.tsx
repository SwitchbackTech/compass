import { IconContext } from "@phosphor-icons/react";
import type React from "react";

export const IconProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <IconContext.Provider
      value={{
        size: 25,
      }}
    >
      {children}
    </IconContext.Provider>
  );
};
