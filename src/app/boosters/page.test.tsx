import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getBoosterOverviewMock = vi.hoisted(() => vi.fn());
const getBoosterOpeningSummaryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/boosters", () => ({
  getBoosterOverview: getBoosterOverviewMock,
  getBoosterOpeningSummary: getBoosterOpeningSummaryMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("./actions", () => ({
  recordBoosterOpeningAction: vi.fn(),
  rollbackBoosterOpeningAction: vi.fn(),
  updateBoosterSettingsAction: vi.fn(),
}));

import BoostersPage from "./page";

async function renderPage(searchParams = {}) {
  getBoosterOpeningSummaryMock.mockResolvedValueOnce(null);
  getBoosterOverviewMock.mockResolvedValueOnce({
    id: null,
    boostersPerInterval: 1,
    intervalCount: 1,
    intervalUnit: "DAY",
    accrualAnchorAt: "1970-01-01T00:00:00.000Z",
    autoDecrementOnOpening: true,
    createdAt: null,
    updatedAt: null,
    counter: {
      accumulatedBoosters: 3,
      completeIntervals: 3,
      accrualAnchorAt: "1970-01-01T00:00:00.000Z",
      calculatedAt: "1970-01-04T00:00:00.000Z",
    },
    recentOpenings: [],
    cardOptions: [{ cardId: "card-1", displayName: "Ahri · OGN #001", allowedVariants: ["NORMAL", "FOIL"] }],
  });
  render(await BoostersPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("BoostersPage", () => {
  it("renders French booster settings labels and default values", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "Paramètres des boosters" })).toBeInTheDocument();
    expect(screen.getByText("Compteur actuel")).toBeInTheDocument();
    expect(screen.getByText("Boosters disponibles")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/Calculé depuis le dernier point d’ancrage/)).toBeInTheDocument();
    expect(screen.getAllByText("Gain quotidien").length).toBeGreaterThan(0);
    expect(screen.getByText("Décrémenter le compteur lors d’une ouverture")).toBeInTheDocument();
    expect(screen.getByLabelText("Gain quotidien")).toHaveValue(1);
    expect(screen.getByRole("checkbox", { name: /Décrémenter le compteur lors d’une ouverture/ })).toBeChecked();
  });

  it("wires a valid update through the settings form action", async () => {
    await renderPage();

    expect(screen.getByRole("button", { name: "Enregistrer les paramètres" })).toBeInTheDocument();
    expect(document.querySelector("form")).toHaveAttribute("action");
  });

  it("renders controlled success and invalid-error feedback", async () => {
    await renderPage({ updated: "1", error: "Paramètres de boosters invalides." });

    expect(screen.getByText("Paramètres des boosters enregistrés.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Paramètres de boosters invalides.");
  });

  it("renders the Phase 7D booster opening entry flow with pulled cards", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "Enregistrer une ouverture" })).toBeInTheDocument();
    expect(screen.getByText(/les transactions de collection correspondantes/)).toBeInTheDocument();
    expect(screen.getByText("Cartes ouvertes")).toBeInTheDocument();
    expect(screen.getByText(/Ajouter à la collection les cartes GAMEPLAY ou ENERGY/)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Carte")).toHaveLength(5);
    expect(screen.getAllByLabelText("Variante")).toHaveLength(5);
    expect(screen.getAllByLabelText("Quantité")).toHaveLength(5);
    expect(screen.queryByText(/pas encore ajoutées automatiquement/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rollback/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Boosters ouverts")).toHaveValue(1);
    expect(screen.getAllByRole("checkbox", { name: /Décrémenter le compteur/ })[1]).toBeChecked();
    expect(screen.getByRole("button", { name: "Ajouter à la collection" })).toBeInTheDocument();
  });


  it("renders the post-opening summary from an opened query parameter", async () => {
    getBoosterOpeningSummaryMock.mockReset();
    getBoosterOpeningSummaryMock.mockResolvedValueOnce({
      id: "opening-1",
      openedAt: "2026-07-04T12:00:00.000Z",
      boosterCount: 2,
      decrementCounter: true,
      distinctCardRows: 1,
      totalCardQuantity: 2,
      newlyCreatedCollectionEntries: 1,
      incrementedCollectionEntries: 0,
      totalCardsAddedToCollection: 2,
      status: "RECORDED",
      canRollback: true,
      rollbackBlockedReason: null,
      pulls: [{ cardId: "card-1", displayName: "Ahri française", setCode: "OGN", collectorNumber: "001", variant: "NORMAL", quantity: 2, collectionQuantityAfterOpening: 2, wasNewCollectionEntry: true }],
    });

    await renderPage({ opened: "opening-1" });

    expect(getBoosterOpeningSummaryMock).toHaveBeenCalledWith("opening-1");
    expect(screen.getByText("Résumé de l’ouverture")).toBeInTheDocument();
    expect(screen.getAllByText("Boosters ouverts").length).toBeGreaterThan(0);
    expect(screen.getByText("Cartes enregistrées")).toBeInTheDocument();
    expect(screen.getByText("Ahri française")).toBeInTheDocument();
    expect(screen.getByText("NORMAL")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Annuler cette ouverture" })).toBeInTheDocument();
    expect(screen.getByText(/Aucun prix ni valeur/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Enregistrer une ouverture" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Paramètres des boosters" })).toBeInTheDocument();
  });




  it("does not show the rollback form for a rolled-back opening", async () => {
    getBoosterOpeningSummaryMock.mockReset();
    getBoosterOpeningSummaryMock.mockResolvedValueOnce({
      id: "opening-1",
      openedAt: "2026-07-04T12:00:00.000Z",
      boosterCount: 1,
      decrementCounter: true,
      distinctCardRows: 0,
      totalCardQuantity: 0,
      newlyCreatedCollectionEntries: 0,
      incrementedCollectionEntries: 0,
      totalCardsAddedToCollection: 0,
      status: "ROLLED_BACK",
      canRollback: false,
      rollbackBlockedReason: "Cette ouverture a déjà été annulée",
      pulls: [],
    });

    await renderPage({ opened: "opening-1" });

    expect(screen.getByText("Ouverture annulée")).toBeInTheDocument();
    expect(screen.getByText("Cette ouverture a déjà été annulée")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler cette ouverture" })).not.toBeInTheDocument();
  });

  it("renders rollback success and controlled failure feedback", async () => {
    await renderPage({ rollbackRecorded: "1", rollbackError: "Annulation impossible : la collection ne contient plus assez d’exemplaires" });

    expect(screen.getByText("Ouverture annulée.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Annulation impossible : la collection ne contient plus assez d’exemplaires");
  });

  it("treats repeated opened query parameters as malformed without crashing", async () => {
    await renderPage({ opened: ["opening-1", "opening-2"] });

    expect(getBoosterOpeningSummaryMock).toHaveBeenLastCalledWith(undefined);
    expect(getBoosterOpeningSummaryMock).not.toHaveBeenCalledWith(["opening-1", "opening-2"]);
    expect(screen.getByRole("status")).toHaveTextContent("Résumé d’ouverture introuvable pour cet identifiant.");
    expect(screen.getByRole("heading", { name: "Paramètres des boosters" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Enregistrer une ouverture" })).toBeInTheDocument();
  });

  it("renders opening success feedback for collection updates", async () => {
    await renderPage({ openingRecorded: "1" });

    expect(screen.getByText("Ouverture de boosters enregistrée et cartes ajoutées à la collection.")).toBeInTheDocument();
  });
});
