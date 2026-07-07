import type { CardVariant } from "./variants";

export const PHYSICAL_FINISHES = ["NORMAL", "FOIL"] as const;
export type PhysicalFinish = (typeof PHYSICAL_FINISHES)[number];

export type LegacyCardVariantCompatibility = {
  variant: CardVariant;
  physicalFinish: PhysicalFinish | null;
  isLegacyShowcaseCompatibility: boolean;
};

export function isPhysicalFinish(value: string): value is PhysicalFinish {
  return (PHYSICAL_FINISHES as readonly string[]).includes(value);
}

export function mapLegacyCardVariantToPhysicalFinish(variant: CardVariant): PhysicalFinish | null {
  switch (variant) {
    case "NORMAL":
      return "NORMAL";
    case "FOIL":
      return "FOIL";
    case "SHOWCASE":
      return null;
  }
}

export function describeLegacyCardVariantCompatibility(variant: CardVariant): LegacyCardVariantCompatibility {
  return {
    variant,
    physicalFinish: mapLegacyCardVariantToPhysicalFinish(variant),
    isLegacyShowcaseCompatibility: variant === "SHOWCASE",
  };
}
