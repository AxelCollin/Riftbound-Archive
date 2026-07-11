import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CollectionDisplayRow } from "@/lib/domain/collection-display";
import { CollectionFilters } from "./CollectionFilters";
import { getCardDetailHref } from "./card-detail-link";

const rows: CollectionDisplayRow[] = [
  {
    rowId: "rba-001-normal",
    cardId: "set/001",
    cardName: "Aatrox l'Éveillé",
    officialImageUrl: "https://assets.example/riftbound/aatrox.webp",
    setCode: "RBA",
    setName: "Origines de Runeterra",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    normalOwnedQuantity: 2,
    normalBinderReservedQuantity: 0,
    normalAvailableQuantity: 2,
    foilOwnedQuantity: 1,
    foilBinderReservedQuantity: 1,
    foilAvailableQuantity: 0,
    totalOwnedQuantity: 3,
    totalBinderReservedQuantity: 1,
    totalAvailableQuantity: 2,
  },
  {
    rowId: "rba-002-foil",
    cardId: "rba-002",
    cardName: "Braum, Gardien du foyer",
    officialImageUrl: null,
    setCode: "RBA",
    setName: "Origines de Runeterra",
    collectorNumber: "002",
    rarity: "RARE",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    normalOwnedQuantity: 0,
    normalBinderReservedQuantity: 0,
    normalAvailableQuantity: 0,
    foilOwnedQuantity: 0,
    foilBinderReservedQuantity: 0,
    foilAvailableQuantity: 0,
    totalOwnedQuantity: 0,
    totalBinderReservedQuantity: 0,
    totalAvailableQuantity: 0,
  },
  {
    rowId: "ene-010-foil",
    cardId: "energy-010",
    cardName: "Énergie prismatique",
    officialImageUrl: "https://assets.example/riftbound/energy.webp",
    setCode: "ENE",
    setName: "Énergies",
    collectorNumber: "010",
    rarity: "UNKNOWN",
    kind: "ENERGY",
    printTreatment: "UNKNOWN",
    normalOwnedQuantity: 0,
    normalBinderReservedQuantity: 0,
    normalAvailableQuantity: 0,
    foilOwnedQuantity: 4,
    foilBinderReservedQuantity: 1,
    foilAvailableQuantity: 3,
    totalOwnedQuantity: 4,
    totalBinderReservedQuantity: 1,
    totalAvailableQuantity: 3,
  },
  {
    rowId: "rba-099-showcase",
    cardId: "rba-099",
    cardName: "Lux dorée",
    officialImageUrl: null,
    setCode: "RBA",
    setName: "Origines de Runeterra",
    collectorNumber: "099",
    rarity: "EPIC",
    kind: "GAMEPLAY",
    printTreatment: "ALT",
    collectorCategory: "SHOWCASE",
    normalOwnedQuantity: 0,
    normalBinderReservedQuantity: 0,
    normalAvailableQuantity: 0,
    foilOwnedQuantity: 1,
    foilBinderReservedQuantity: 0,
    foilAvailableQuantity: 1,
    totalOwnedQuantity: 1,
    totalBinderReservedQuantity: 0,
    totalAvailableQuantity: 1,
  },
];

function renderFilters() {
  render(<CollectionFilters rows={rows} />);
}

function visibleBodyRows() {
  return screen.queryAllByRole("row").slice(1);
}

function rowForCard(cardName: string) {
  const link = screen.getByRole("link", { name: cardName });
  const row = link.closest("tr");

  if (row === null) {
    throw new Error(`Expected ${cardName} to render inside a table row.`);
  }

  return row;
}

function quantityCellsForCard(cardName: string) {
  const cells = within(rowForCard(cardName)).getAllByRole("cell");

  return {
    selected: cells[6],
    owned: cells[7],
    binderReserved: cells[8],
    available: cells[9],
  };
}

function expectVisibleCards(cardNames: string[]) {
  const renderedRows = visibleBodyRows();

  expect(renderedRows).toHaveLength(cardNames.length);

  for (const cardName of cardNames) {
    expect(screen.queryByRole("link", { name: cardName })).not.toBeNull();
  }
}

describe("CollectionFilters", () => {
  it("initially renders every collection row", () => {
    renderFilters();

    expect(screen.getByText("4 résultats affichés / 4")).toBeTruthy();
    expectVisibleCards(["Aatrox l'Éveillé", "Braum, Gardien du foyer", "Énergie prismatique", "Lux dorée"]);
  });

  it("defaults to displaying owned quantities as the main row quantity", () => {
    renderFilters();

    expect(screen.getByLabelText("Quantité affichée")).toHaveProperty("value", "OWNED");
    expect(screen.getByRole("button", { name: "Ligne" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("collection-line-view")).toBeTruthy();
    expect(screen.getByText("Quantité affichée (Possédées)")).toBeTruthy();

    const energyQuantities = quantityCellsForCard("Énergie prismatique");

    expect(energyQuantities.selected.textContent).toBe("4");
    expect(energyQuantities.owned.textContent).toBe("4");
    expect(energyQuantities.binderReserved.textContent).toBe("1");
    expect(energyQuantities.available.textContent).toBe("3");
  });

  it("switches the main row quantity to available quantities and back to owned quantities", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Quantité affichée"), { target: { value: "AVAILABLE" } });

    expect(screen.getByText("Quantité affichée (Disponibles)")).toBeTruthy();
    expect(quantityCellsForCard("Énergie prismatique").selected.textContent).toBe("3");
    expect(quantityCellsForCard("Énergie prismatique").binderReserved.textContent).toBe("1");

    fireEvent.change(screen.getByLabelText("Quantité affichée"), { target: { value: "OWNED" } });

    expect(screen.getByText("Quantité affichée (Possédées)")).toBeTruthy();
    expect(quantityCellsForCard("Énergie prismatique").selected.textContent).toBe("4");
  });


  it("switches between grid, line, and compact visual views without changing filtered data", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "rba" } });
    fireEvent.click(screen.getByRole("button", { name: "Grille" }));

    expect(screen.getByTestId("collection-grid-view")).toBeTruthy();
    expect(screen.queryByTestId("collection-line-view")).toBeNull();
    expect(screen.getByText("3 résultats affichés / 4")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Énergie prismatique" })).toBeNull();
    expect(screen.getByRole("link", { name: "Aatrox l'Éveillé" }).getAttribute("href")).toBe(getCardDetailHref("set/001"));

    fireEvent.click(screen.getByRole("button", { name: "Compact" }));

    expect(screen.getByTestId("collection-compact-view")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Collection compacte" })).toBeTruthy();
    expectVisibleCards(["Aatrox l'Éveillé", "Braum, Gardien du foyer", "Lux dorée"]);

    fireEvent.click(screen.getByRole("button", { name: "Ligne" }));

    expect(screen.getByTestId("collection-line-view")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Collection en lignes" })).toBeTruthy();
    expectVisibleCards(["Aatrox l'Éveillé", "Braum, Gardien du foyer", "Lux dorée"]);
  });

  it("keeps quantity display independent from the selected visual view", () => {
    renderFilters();

    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    fireEvent.change(screen.getByLabelText("Quantité affichée"), { target: { value: "AVAILABLE" } });

    expect(screen.getByTestId("collection-compact-view")).toBeTruthy();
    expect(screen.getByText("Quantité affichée (Disponibles)")).toBeTruthy();
    expect(quantityCellsForCard("Énergie prismatique").selected.textContent).toBe("3");

    fireEvent.click(screen.getByRole("button", { name: "Grille" }));

    expect(screen.getByTestId("collection-grid-view")).toBeTruthy();
    expect(screen.getAllByLabelText("Quantité affichée Disponibles").map((node) => node.textContent)).toContain("3");
    expect(screen.getByRole("link", { name: "Énergie prismatique" }).getAttribute("href")).toBe(getCardDetailHref("energy-010"));
  });


  it("renders card art and placeholders in grid mode while keeping detail links", () => {
    renderFilters();

    fireEvent.click(screen.getByRole("button", { name: "Grille" }));

    expect(screen.getByTestId("collection-grid-view")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Illustration de Aatrox l'Éveillé" }).getAttribute("src")).toBe("https://assets.example/riftbound/aatrox.webp");
    expect(screen.getByRole("img", { name: "Illustration non disponible pour Braum, Gardien du foyer" })).toBeTruthy();
    expect(screen.getAllByText("No art").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Aatrox l'Éveillé" }).getAttribute("href")).toBe(getCardDetailHref("set/001"));
  });

  it("renders small card visuals in line mode and no visuals in compact mode", () => {
    renderFilters();

    expect(screen.getByTestId("collection-line-view")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Illustration de Aatrox l'Éveillé" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Illustration non disponible pour Braum, Gardien du foyer" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Braum, Gardien du foyer" }).getAttribute("href")).toBe(getCardDetailHref("rba-002"));

    fireEvent.click(screen.getByRole("button", { name: "Compact" }));

    expect(screen.getByTestId("collection-compact-view")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Illustration de Aatrox l'Éveillé" })).toBeNull();
    expect(screen.queryByRole("img", { name: "Illustration non disponible pour Braum, Gardien du foyer" })).toBeNull();
    expect(screen.getByRole("link", { name: "Braum, Gardien du foyer" }).getAttribute("href")).toBe(getCardDetailHref("rba-002"));
  });

  it("filters rows by card name from the search input", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "braum" } });

    expectVisibleCards(["Braum, Gardien du foyer"]);
  });

  it.each([
    ["set code", "ene", "Énergie prismatique"],
    ["collector number", "099", "Lux dorée"],
  ])("filters rows by %s from the search input", (_caseName, searchText, expectedCardName) => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: searchText } });

    expectVisibleCards([expectedCardName]);
  });

  it.each([
    ["Rareté", "RARE", ["Braum, Gardien du foyer"]],
    ["Type", "ENERGY", ["Énergie prismatique"]],
  ])("filters rows from the %s select", (label, value, expectedCardNames) => {
    renderFilters();

    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    expectVisibleCards(expectedCardNames);
  });

  it.each([
    ["OWNED", ["Aatrox l'Éveillé", "Énergie prismatique", "Lux dorée"]],
    ["MISSING", ["Braum, Gardien du foyer"]],
  ])("filters rows by owned status %s", (ownedStatus, expectedCardNames) => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Statut"), { target: { value: ownedStatus } });

    expectVisibleCards(expectedCardNames);
  });

  it("removes the user-facing variant filter from grouped collection rows", () => {
    renderFilters();

    expect(screen.queryByLabelText("Variante")).toBeNull();
  });

  it("combines filters to narrow the rendered rows", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "rba" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "GAMEPLAY" } });
    fireEvent.change(screen.getByLabelText("Statut"), { target: { value: "OWNED" } });

    expectVisibleCards(["Aatrox l'Éveillé", "Lux dorée"]);
  });

  it("keeps search filtering stable after switching display modes", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Quantité affichée"), { target: { value: "AVAILABLE" } });
    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "énergie" } });

    expectVisibleCards(["Énergie prismatique"]);
    expect(quantityCellsForCard("Énergie prismatique").selected.textContent).toBe("3");
  });

  it("shows the French empty state when filters match no rows", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "introuvable" } });

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Aucune ligne ne correspond aux filtres.")).toBeTruthy();
    expect(screen.getByText("Modifiez la recherche ou réinitialisez les filtres pour retrouver les cartes suivies.")).toBeTruthy();
  });

  it("renders card detail links with encoded route-safe hrefs", () => {
    renderFilters();

    const link = screen.getByRole("link", { name: "Aatrox l'Éveillé" });

    expect(link.getAttribute("href")).toBe("/cards/set%2F001");
    expect(within(visibleBodyRows()[0]).getByRole("link").getAttribute("href")).toBe(getCardDetailHref("set/001"));
  });
});
