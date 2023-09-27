export type Category_VM = "staging" | "production";

export interface VmInfo {
  baseUrl: string;
  destination: Category_VM;
}
