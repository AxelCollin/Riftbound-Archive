import type { CardKind, CardRarity } from "../domain/cards";
import type { CardFaction } from "../domain/card-taxonomy";
import type { CardVariant } from "../domain/variants";

export type CardPrintTreatment = "REGULAR" | "ALT" | "OVERNUMBER" | "UNKNOWN";

export const cardVariantLabelsFr: Record<CardVariant, string> = {
  NORMAL: "Normale",
  FOIL: "Foil",
  SHOWCASE: "Showcase",
};

export const cardRarityLabelsFr: Record<CardRarity, string> = {
  COMMON: "Commune",
  UNCOMMON: "Peu commune",
  RARE: "Rare",
  EPIC: "Épique",
  ULTIMATE: "Ultime",
  UNKNOWN: "Inconnue",
};

export const cardKindLabelsFr: Record<CardKind, string> = {
  GAMEPLAY: "Gameplay",
  ENERGY: "Énergie",
  TOKEN: "Jeton",
  RULES: "Règles",
};

export const cardPrintTreatmentLabelsFr: Record<CardPrintTreatment, string> = {
  REGULAR: "Régulier",
  ALT: "Alternatif",
  OVERNUMBER: "Surnuméroté",
  UNKNOWN: "Inconnu",
};

export const cardFactionLabelsFr: Record<CardFaction, string> = {
  FURY: "Furie",
  CALM: "Calme",
  MIND: "Esprit",
  BODY: "Corps",
  CHAOS: "Chaos",
  ORDER: "Ordre",
};

export const cardFactionIconTokens: Record<CardFaction, string> = {
  FURY: "Fu",
  CALM: "Ca",
  MIND: "Es",
  BODY: "Co",
  CHAOS: "Ch",
  ORDER: "Or",
};
