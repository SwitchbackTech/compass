import {
  type PayloadAction,
  type Slice,
  type SliceCaseReducers,
  createSlice,
} from "@reduxjs/toolkit";
import { type UserMetadata } from "@core/types/user.types";

export type UserMetadataStatus = "idle" | "loading" | "loaded";

/** State type used by consumers and RootState. */
export interface UserMetadataState {
  current: UserMetadata | null;
  status: UserMetadataStatus;
}

/**
 * Shallow state type used only inside createSlice to avoid "Type instantiation
 * is excessively deep" (UserMetadata extends SupertokensUserMetadata.JSONObject).
 */
interface UserMetadataSliceState {
  current: unknown;
  status: UserMetadataStatus;
}

const initialState: UserMetadataSliceState = {
  current: null,
  status: "idle",
};

export const userMetadataSlice = createSlice({
  name: "userMetadata",
  initialState,
  reducers: {
    setLoading: (state) => {
      state.status = "loading";
    },
    finishLoading: (state) => {
      state.status = state.current ? "loaded" : "idle";
    },
    set: (state, action: PayloadAction<UserMetadata>) => {
      state.current = action.payload;
      state.status = "loaded";
    },
    clear: (state) => {
      state.current = null;
      state.status = "idle";
    },
  },
}) as Slice<
  UserMetadataState,
  SliceCaseReducers<UserMetadataState>,
  "userMetadata"
>;
