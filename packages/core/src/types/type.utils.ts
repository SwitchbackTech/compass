export type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: any;
};

//example:
//data: Omit<Payload_Resource_Events, "nextSyncToken">
// same as Payload..., except for "nextSyncToken"
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
