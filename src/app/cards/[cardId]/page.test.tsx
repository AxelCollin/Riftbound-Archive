import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CardDetail } from "@/lib/queries/card-detail";

const queryMock = vi.hoisted(() => ({
  getCardDetailFromRouteParam: vi.fn(),
}));
const navigationMock = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/queries/card-detail", () => queryMock);
vi.mock("next/navigation", () => navigationMock);

import CardDetailPage from "./page";

function detail(overrides: Partial<CardDetail> = {}): CardDetail {
  return {
    printing: {
      id: "card/id with spaces",
      displayName: "Ahri, Gardienne",
      officialName: "Ahri Keeper",
      officialImageUrl: null,
      officialArtist: "Riot Artist",
      set: { code: "ORG", name: "Origines" },
      collectorNumber: "001",
      gameplayIdentityKey: "  ahri-key  ",
      gameplayType: "CHAMPION",
      gameplayRarity: "COMMON",
      collectorCategory: "STANDARD",
      showcaseTreatment: null,
      printTreatment: "REGULAR",
      factions: ["CALM"],
    },
    possession: {
      isTrackable: true,
      totalOwnedQuantity: 3,
      totalBinderReservedQuantity: 1,
      totalAvailableQuantity: 2,
      normal: { ownedQuantity: 1, binderReservedQuantity: 0, availableQuantity: 1 },
      foil: { ownedQuantity: 2, binderReservedQuantity: 1, availableQuantity: 1 },
      legacyShowcaseCompatibility: { ownedQuantity: 1, binderReservedQuantity: 0, availableQuantity: 1 },
    },
    relatedPrintings: [
      {
        id: "related/id with spaces",
        displayName: "Ahri Showcase",
        officialImageUrl: null,
        set: { code: "ORG", name: "Origines" },
        collectorNumber: "101",
        collectorCategory: "SHOWCASE",
        showcaseTreatment: "ALTERNATIVE",
        printTreatment: "ALT",
        ownedQuantity: 0,
        href: "/cards/related%2Fid%20with%20spaces",
      },
    ],
    translations: [
      { locale: "fr-FR", name: "Ahri", subtitle: "Gardienne", rulesText: "Quand vous jouez une carte, piochez.", flavorText: "Une lumière dans la faille." },
    ],
    userMeta: { favorite: true, note: "À classer" },
    officialRarityRaw: "Common",
    printTreatmentRaw: null,
    ...overrides,
  };
}

async function renderPage(card: CardDetail | null) {
  queryMock.getCardDetailFromRouteParam.mockResolvedValueOnce(card);
  render(await CardDetailPage({ params: Promise.resolve({ cardId: "card-id" }) }));
}

describe("CardDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Normal and Foil possession blocks plus read-only legacy Showcase compatibility", async () => {
    await renderPage(detail());

    expect(queryMock.getCardDetailFromRouteParam).toHaveBeenCalledWith("card-id");
    expect(screen.getByRole("heading", { name: "Normal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Foil" })).toBeInTheDocument();
    expect(screen.getByText("Données de compatibilité Showcase héritées — lecture seule")).toBeInTheDocument();
  });

  it("renders encoded related-printing links and placeholders when images are missing", async () => {
    await renderPage(detail());

    expect(screen.getByText("Image indisponible")).toBeInTheDocument();
    expect(screen.getByText("Sans image")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ahri Showcase/ })).toHaveAttribute("href", "/cards/related%2Fid%20with%20spaces");
  });

  it("renders the no-related-printing empty state", async () => {
    await renderPage(detail({ relatedPrintings: [] }));

    expect(screen.getByText("Aucune autre impression liée par identité de gameplay.")).toBeInTheDocument();
  });

  it("keeps card translations and rules text visible", async () => {
    await renderPage(detail());

    expect(screen.getByRole("heading", { name: "Ahri" })).toBeInTheDocument();
    expect(screen.getByText("Gardienne")).toBeInTheDocument();
    expect(screen.getByText("Quand vous jouez une carte, piochez.")).toBeInTheDocument();
    expect(screen.getByText("Une lumière dans la faille.")).toBeInTheDocument();
  });

  it("reaches notFound for an unknown card", async () => {
    queryMock.getCardDetailFromRouteParam.mockResolvedValueOnce(null);

    await expect(CardDetailPage({ params: Promise.resolve({ cardId: "unknown" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigationMock.notFound).toHaveBeenCalledOnce();
  });
});
