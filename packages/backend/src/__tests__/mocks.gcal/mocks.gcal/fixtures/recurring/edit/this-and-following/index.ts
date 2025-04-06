import * as batch1 from "./batch1";
import * as batch2 from "./batch2";

export const thisAndFollowingPayloads = [
  ...batch1.thisAndFollowingBatch1Payloads,
  ...batch2.thisAndFollowingBatch2Payloads,
];
