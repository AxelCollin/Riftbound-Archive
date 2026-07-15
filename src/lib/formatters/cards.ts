import type { CardKind, CardRarity } from "../domain/cards";
import type { CardCollectorCategory, CardFaction, CardGameplayRarity, CardGameplayType, ShowcaseTreatment } from "../domain/card-taxonomy";
import type { PhysicalFinish } from "../domain/physical-finishes";
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

export const cardGameplayTypeLabelsFr: Record<CardGameplayType, string> = {
  UNIT: "Unité",
  CHAMPION: "Champion",
  TERRAIN: "Terrain",
  LEGEND: "Légende",
  SPELL: "Sort",
  RUNE: "Rune / Énergie",
  TOKEN: "Jeton",
  RULES: "Règles",
  UNKNOWN: "Type inconnu",
};

export const cardGameplayRarityLabelsFr: Record<CardGameplayRarity, string> = {
  COMMON: "Commune",
  UNCOMMON: "Peu commune",
  RARE: "Rare",
  EPIC: "Épique",
  UNKNOWN: "Rareté inconnue",
};

export const cardCollectorCategoryLabelsFr: Record<CardCollectorCategory, string> = {
  STANDARD: "Standard",
  SHOWCASE: "Showcase",
  UNKNOWN: "Catégorie inconnue",
};

export const showcaseTreatmentLabelsFr: Record<ShowcaseTreatment, string> = {
  ALTERNATIVE: "Alternative",
  OVERNUMBER: "Surnumérotée",
  SIGNED: "Signée",
  ULTIMATE: "Ultimate",
  UNKNOWN: "Traitement inconnu",
};

export const physicalFinishLabelsFr: Record<PhysicalFinish, string> = {
  NORMAL: "Normal",
  FOIL: "Foil",
};
