import { describe, expect, it } from "vitest";

import { getEffectivePricingPhysicalFinish } from "./pricing";

describe("pricing physical finish compatibility", () => {
  it("prefers persisted physicalFinish over legacy variant", () => {
    expect(getEffectivePricingPhysicalFinish({ variant: "NORMAL", physicalFinish: "FOIL" })).toBe("FOIL");
    expect(getEffectivePricingPhysicalFinish({ variant: "FOIL", physicalFinish: "NORMAL" })).toBe("NORMAL");
  });

  it("falls back from legacy NORMAL and FOIL variants when physicalFinish is null", () => {
    expect(getEffectivePricingPhysicalFinish({ variant: "NORMAL", physicalFinish: null })).toBe("NORMAL");
    expect(getEffectivePricingPhysicalFinish({ variant: "FOIL", physicalFinish: null })).toBe("FOIL");
  });

  it("does not convert legacy SHOWCASE rows into Normal or Foil pricing rows", () => {
    expect(getEffectivePricingPhysicalFinish({ variant: "SHOWCASE", physicalFinish: null })).toBeNull();
  });
});
