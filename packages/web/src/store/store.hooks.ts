import { useDispatch, TypedUseSelectorHook, useSelector } from "react-redux";

import { AppDispatch, RootState } from ".";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
