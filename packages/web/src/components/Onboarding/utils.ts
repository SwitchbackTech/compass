import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export class OnboardingHeaderNoteLocalStorage {
  static get = (): string | null => {
    const note = localStorage.getItem(STORAGE_KEYS.ONBOARDING_HEADER_NOTE);
    return note;
  };

  static set = (note: string): void => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_HEADER_NOTE, note);
  };

  static clear = (): void => {
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_HEADER_NOTE);
  };
}
