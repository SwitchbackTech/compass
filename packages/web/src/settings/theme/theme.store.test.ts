import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { THEME_STORAGE_KEY } from "./theme.constants";
import { themeActions, useThemeStore } from "./theme.store";
import { readStoredTheme } from "./theme.util";
import { beforeEach, describe, expect, it } from "bun:test";

describe("theme store + util", () => {
  beforeEach(() => {
    persistentBrowserStore.remove(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute("data-theme");
    useThemeStore.setState({ theme: "dark-abyss" });
  });

  it("falls back to the default theme when nothing is stored", () => {
    expect(readStoredTheme()).toBe("dark-abyss");
  });

  it("falls back to the default theme for an unknown stored value", () => {
    persistentBrowserStore.set(THEME_STORAGE_KEY, "neon-swamp");
    expect(readStoredTheme()).toBe("dark-abyss");
  });

  it("reads back a valid stored theme", () => {
    persistentBrowserStore.set(THEME_STORAGE_KEY, "light-beach");
    expect(readStoredTheme()).toBe("light-beach");
  });

  it("setTheme updates state, persists, and sets the data-theme attribute", () => {
    themeActions.setTheme("light-beach");

    expect(useThemeStore.getState().theme).toBe("light-beach");
    expect(persistentBrowserStore.get(THEME_STORAGE_KEY)).toBe("light-beach");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "light-beach",
    );
  });

  it("setTheme back to dark writes the explicit dark attribute", () => {
    themeActions.setTheme("light-beach");
    themeActions.setTheme("dark-abyss");

    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "dark-abyss",
    );
    expect(persistentBrowserStore.get(THEME_STORAGE_KEY)).toBe("dark-abyss");
  });
});
