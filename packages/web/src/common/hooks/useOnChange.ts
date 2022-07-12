import React, { useCallback, useState } from "react";

export interface TargetWithValue {
  value: string;
}

export type OnChange<T> = (e: React.ChangeEvent<T & TargetWithValue>) => void;

export const useOnChange = <T>(
  initialValue: string | undefined = ""
): [string, OnChange<T>, React.Dispatch<React.SetStateAction<string>>] => {
  const [value, setValue] = useState(initialValue);

  const onChangeFn: OnChange<T> = (e) => {
    setValue(e.target.value);
  };

  const onChange = useCallback(onChangeFn, []);

  return [value, onChange, setValue];
};
