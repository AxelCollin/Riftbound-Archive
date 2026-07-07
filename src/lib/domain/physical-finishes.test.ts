import { describe, expect, it } from "vitest";

import {
  PHYSICAL_FINISHES,
  describeLegacyCardVariantCompatibility,
  isPhysicalFinish,
  mapLegacyCardVariantToPhysicalFinish,
} from "./physical-finishes";


describe("physical finish taxonomy", () => {
  it("only exposes NORMAL and FOIL as physical finishes", () => {
    expect(PHYSICAL_FINISHES).toEqual(["NORMAL", "FOIL"]);
    expect(PHYSICAL_FINISHES).not.toContain("SHOWCASE");
    expect(isPhysicalFinish("NORMAL")).toBe(true);
    expect(isPhysicalFinish("FOIL")).toBe(true);
    expect(isPhysicalFinish("SHOWCASE")).toBe(false);
  });

  it("maps legacy NORMAL and FOIL CardVariant values to physical finishes", () => {
    expect(mapLegacyCardVariantToPhysicalFinish("NORMAL")).toBe("NORMAL");
    expect(mapLegacyCardVariantToPhysicalFinish("FOIL")).toBe("FOIL");
  });

  it("keeps legacy SHOWCASE compatibility out of the physical finish axis", () => {
    expect(mapLegacyCardVariantToPhysicalFinish("SHOWCASE")).toBeNull();
    expect(describeLegacyCardVariantCompatibility("SHOWCASE")).toEqual({
      variant: "SHOWCASE",
      physicalFinish: null,
      isLegacyShowcaseCompatibility: true,
    });
  });
});
