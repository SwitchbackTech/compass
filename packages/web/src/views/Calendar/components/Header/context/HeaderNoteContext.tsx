import React from "react";
import { createContext, useContext, useState } from "react";

interface NoteContextType {
  note: string;
  setNote: (note: string) => void;
}

const NoteContext = createContext<NoteContextType>({
  note: "",
  setNote: () => {},
});

export const NoteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [note, setNote] = useState("");

  return (
    <NoteContext.Provider value={{ note, setNote }}>
      {children}
    </NoteContext.Provider>
  );
};

export const useNote = () => useContext(NoteContext);
