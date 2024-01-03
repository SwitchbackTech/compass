export type Category_VM = "staging" | "production";

export interface Info_VM {
  baseUrl: string;
  destination: Category_VM;
}

export interface Options_Cli {
  build?: boolean;
  delete?: boolean;
  environment?: Category_VM;
  force?: boolean;
  packages?: string[];
  skipEnv?: boolean;
  user?: string;
}
