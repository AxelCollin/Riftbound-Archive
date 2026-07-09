export const CARD_LANGUAGES = ["FR", "EN", "ZH", "UNKNOWN"] as const;
export type CardLanguage = (typeof CARD_LANGUAGES)[number];

export const PHYSICAL_CARD_LANGUAGES = ["FR", "EN", "ZH"] as const satisfies readonly CardLanguage[];
export type SelectablePhysicalCardLanguage = (typeof PHYSICAL_CARD_LANGUAGES)[number];

const CARD_LANGUAGE_LABELS: Record<CardLanguage, string> = {
  FR: "Français",
  EN: "Anglais",
  ZH: "Chinois",
  UNKNOWN: "Langue inconnue",
};

export function isCardLanguage(value: unknown): value is CardLanguage {
  return typeof value === "string" && CARD_LANGUAGES.includes(value as CardLanguage);
}

export function getCardLanguageLabel(language: CardLanguage): string {
  return CARD_LANGUAGE_LABELS[language];
}

export function normalizeCardLanguage(value: unknown): CardLanguage | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return isCardLanguage(normalized) ? normalized : null;
}
