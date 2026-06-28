import { describe, expect, it } from "vitest";
import { createCardDetail, type CardDetailRecord } from "./card-detail";

function card(overrides: Partial<CardDetailRecord>): CardDetailRecord {
  return {
    id: "card-1",
    name: "Base Name",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    hasShowcase: false,
    officialRarityRaw: null,
    printTreatmentRaw: null,
    officialImageUrl: null,
    officialArtist: null,
    set: { code: "ORG", name: "Origins" },
    translations: [],
    collectionEntries: [],
    userMeta: null,
    ...overrides,
  };
}

describe("card detail mapping", () => {
  it("returns the preferred display name using translation fallback", () => {
    const detail = createCardDetail(
      card({
        translations: [
          { locale: "en-US", name: "English Name", subtitle: null, rulesText: null, flavorText: null },
          { locale: "fr", name: "Nom français", subtitle: null, rulesText: null, flavorText: null },
          { locale: "fr-FR", name: "Nom France", subtitle: null, rulesText: null, flavorText: null },
        ],
      }),
    );

    expect(detail.displayName).toBe("Nom France");
  });

  it("shows quantity 0 for allowed variants without snapshots", () => {
    const detail = createCardDetail(card({ rarity: "COMMON", collectionEntries: [{ variant: "FOIL", quantity: 2 }] }));

    expect(detail.ownershipRows).toEqual([
      { variant: "NORMAL", ownedQuantity: 0 },
      { variant: "FOIL", ownedQuantity: 2 },
    ]);
  });

  it("maps existing CollectionEntry snapshots to the matching variant row", () => {
    const detail = createCardDetail(
      card({
        rarity: "EPIC",
        hasShowcase: true,
        collectionEntries: [
          { variant: "FOIL", quantity: 1 },
          { variant: "SHOWCASE", quantity: 3 },
        ],
      }),
    );

    expect(detail.ownershipRows).toEqual([
      { variant: "FOIL", ownedQuantity: 1 },
      { variant: "SHOWCASE", ownedQuantity: 3 },
    ]);
  });

  it("marks TOKEN and RULES cards as non-trackable without ownership variants", () => {
    expect(createCardDetail(card({ kind: "TOKEN" })).ownershipRows).toEqual([]);
    expect(createCardDetail(card({ kind: "RULES" })).isTrackable).toBe(false);
  });
});
