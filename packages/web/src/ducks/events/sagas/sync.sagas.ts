import { call, put } from "@redux-saga/core/effects";
import { handleError } from "@web/common/utils/event/event.util";
import { SyncApi } from "../../../common/apis/sync.api";
import { importGCalSlice } from "../slices/sync.slice";

export function* importGCal() {
  try {
    yield call(SyncApi.importGCal);
    yield put(importGCalSlice.actions.success(undefined));
  } catch (error) {
    yield put(importGCalSlice.actions.error(undefined));
    handleError(error as Error);
  }
}
