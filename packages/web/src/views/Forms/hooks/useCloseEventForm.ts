import { useAppDispatch } from "@web/store/store.hooks";
import { createUseCloseEventForm } from "./useCloseEventForm.factory";

export const useCloseEventForm = createUseCloseEventForm({ useAppDispatch });
