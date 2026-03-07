import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import { type UserMetadata } from "@core/types/user.types";

interface UserMetadataState {
  current: UserMetadata | null;
}

const initialState: UserMetadataState = {
  current: null,
};

export const userMetadataSlice = createSlice({
  name: "userMetadata",
  initialState,
  reducers: {
    set: (state, action: PayloadAction<UserMetadata>) => {
      state.current = action.payload;
    },
    clear: (state) => {
      state.current = null;
    },
  },
});
