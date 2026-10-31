import { it, expect } from "vitest";
import { getMessages, locales, formatting } from "./index";
it("falls back to English for untranslated languages", () => {
  for (const locale of locales) expect(getMessages(locale)).toEqual(getMessages("en"));
  expect(formatting).toEqual({ locale: "en-ZA", currency: "ZAR", timeZone: "Africa/Johannesburg" });
});
