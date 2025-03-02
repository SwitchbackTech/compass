import React from "react";
import { IconContext } from "@phosphor-icons/react";

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
