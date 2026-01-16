import { call, put } from "@redux-saga/core/effects";
import { handleError } from "@web/common/utils/event/event.util";
import { SyncApi } from "../../../common/apis/sync.api";
import { importGCalSlice } from "../slices/sync.slice";

type NoArgActionCreator<T> = T extends (...args: never[]) => infer R
  ? () => R
  : never;

const successAction = importGCalSlice.actions
  .success as unknown as NoArgActionCreator<
  typeof importGCalSlice.actions.success
>;

const errorAction = importGCalSlice.actions
  .error as unknown as NoArgActionCreator<typeof importGCalSlice.actions.error>;

export function* importGCal() {
  try {
    yield call(SyncApi.importGCal);
    yield put(successAction());
  } catch (error) {
    yield put(errorAction());
    handleError(error as Error);
  }
}
