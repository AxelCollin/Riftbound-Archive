import { describe, expect, it } from "vitest";
import { CARD_LANGUAGES, PHYSICAL_CARD_LANGUAGES, getCardLanguageLabel, isCardLanguage, normalizeCardLanguage } from "./card-languages";

describe("physical card languages", () => {
  it("exposes the supported physical language enum values including UNKNOWN", () => {
    expect(CARD_LANGUAGES).toEqual(["FR", "EN", "ZH", "UNKNOWN"]);
    expect(isCardLanguage("FR")).toBe(true);
    expect(isCardLanguage("EN")).toBe(true);
    expect(isCardLanguage("ZH")).toBe(true);
    expect(isCardLanguage("UNKNOWN")).toBe(true);
  });

  it("keeps UNKNOWN out of selectable physical languages", () => {
    expect(PHYSICAL_CARD_LANGUAGES).toEqual(["FR", "EN", "ZH"]);
    expect(PHYSICAL_CARD_LANGUAGES).not.toContain("UNKNOWN");
    expect(getCardLanguageLabel("UNKNOWN")).toBe("Langue inconnue");
  });

  it("normalizes existing string inputs without guessing from UI locale", () => {
    expect(normalizeCardLanguage(" fr ")).toBe("FR");
    expect(normalizeCardLanguage("en")).toBe("EN");
    expect(normalizeCardLanguage("zh")).toBe("ZH");
    expect(normalizeCardLanguage("fr-FR")).toBeNull();
  });
});
