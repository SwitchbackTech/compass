export type SupportedBrowser =
  | "chrome"
  | "firefox"
  | "brave"
  | "edge"
  | "safari";

export type BrowserCleanupPromptAnswers = {
  cleanup: boolean;
};

export type DeleteConfirmPromptAnswers = {
  delete: boolean;
};
