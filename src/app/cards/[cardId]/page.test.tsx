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

vi.mock("./actions", () => ({ updateCardDetailQuantityAction: vi.fn(), updateCardFavoriteAction: vi.fn(), updateCardNoteAction: vi.fn() }));

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
      reservationStatus: "Réservée en Foil",
      normal: { ownedQuantity: 1, binderReservedQuantity: 0, availableQuantity: 1, editableUnknownQuantity: 0, canIncrement: true, canDecrement: false },
      foil: { ownedQuantity: 2, binderReservedQuantity: 1, availableQuantity: 1, editableUnknownQuantity: 1, canIncrement: true, canDecrement: true },
      legacyShowcaseCompatibility: { ownedQuantity: 1, binderReservedQuantity: 0, availableQuantity: 1, editableUnknownQuantity: 0, canIncrement: false, canDecrement: false },
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

async function renderPage(card: CardDetail | null, searchParams: Record<string, string> = {}) {
  queryMock.getCardDetailFromRouteParam.mockResolvedValueOnce(card);
  render(await CardDetailPage({ params: Promise.resolve({ cardId: "card-id" }), searchParams: Promise.resolve(searchParams) }));
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


  it("renders quantity controls with UNKNOWN editable decrement rules", async () => {
    await renderPage(detail());
    expect(screen.getByRole("button", { name: "Ajouter une copie Normal de Ahri, Gardienne" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Retirer une copie Normal de Ahri, Gardienne" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ajouter une copie Foil de Ahri, Gardienne" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Retirer une copie Foil de Ahri, Gardienne" })).toBeEnabled();
    expect(screen.getAllByText(/Copies sans langue définie modifiables/)).toHaveLength(2);
  });

  it("hides active controls for unsupported finishes and untrackable cards", async () => {
    await renderPage(detail({ possession: { ...detail().possession, normal: { ownedQuantity: 0, binderReservedQuantity: 0, availableQuantity: 0, editableUnknownQuantity: 0, canIncrement: false, canDecrement: false } } }));
    expect(screen.queryByRole("button", { name: "Ajouter une copie Normal de Ahri, Gardienne" })).not.toBeInTheDocument();
    expect(screen.getByText("Non disponible pour cette impression")).toBeInTheDocument();
  });

  it("renders favorite, note, and feedback banners", async () => {
    await renderPage(detail(), { quantityUpdated: "1", favoriteUpdated: "1", noteUpdated: "1", quantityError: "Erreur sûre" });
    expect(screen.getByRole("button", { name: "Retirer des favoris Ahri, Gardienne" })).toBeInTheDocument();
    expect(screen.getByLabelText("Note locale")).toHaveValue("À classer");
    expect(screen.getAllByRole("status")).toHaveLength(3);
    expect(screen.getByRole("alert")).toHaveTextContent("Erreur sûre");
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

    await expect(CardDetailPage({ params: Promise.resolve({ cardId: "unknown" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigationMock.notFound).toHaveBeenCalledOnce();
  });
});
