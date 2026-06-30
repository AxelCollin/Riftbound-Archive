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
    setCode: "RBA",
    setName: "Origines de Runeterra",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    variant: "NORMAL",
    ownedQuantity: 2,
    binderReservedQuantity: 0,
    availableQuantity: 2,
  },
  {
    rowId: "rba-002-foil",
    cardId: "rba-002",
    cardName: "Braum, Gardien du foyer",
    setCode: "RBA",
    setName: "Origines de Runeterra",
    collectorNumber: "002",
    rarity: "RARE",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    variant: "FOIL",
    ownedQuantity: 0,
    binderReservedQuantity: 0,
    availableQuantity: 0,
  },
  {
    rowId: "ene-010-foil",
    cardId: "energy-010",
    cardName: "Énergie prismatique",
    setCode: "ENE",
    setName: "Énergies",
    collectorNumber: "010",
    rarity: "UNKNOWN",
    kind: "ENERGY",
    printTreatment: "UNKNOWN",
    variant: "FOIL",
    ownedQuantity: 4,
    binderReservedQuantity: 1,
    availableQuantity: 3,
  },
  {
    rowId: "rba-099-showcase",
    cardId: "rba-099",
    cardName: "Lux dorée",
    setCode: "RBA",
    setName: "Origines de Runeterra",
    collectorNumber: "099",
    rarity: "EPIC",
    kind: "GAMEPLAY",
    printTreatment: "ALT",
    variant: "SHOWCASE",
    ownedQuantity: 1,
    binderReservedQuantity: 0,
    availableQuantity: 1,
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
    selected: cells[7],
    owned: cells[8],
    binderReserved: cells[9],
    available: cells[10],
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

    expect(screen.getByLabelText("Affichage")).toHaveProperty("value", "OWNED");
    expect(screen.getByText("Quantité affichée (Possédées)")).toBeTruthy();

    const energyQuantities = quantityCellsForCard("Énergie prismatique");

    expect(energyQuantities.selected.textContent).toBe("4");
    expect(energyQuantities.owned.textContent).toBe("4");
    expect(energyQuantities.binderReserved.textContent).toBe("1");
    expect(energyQuantities.available.textContent).toBe("3");
  });

  it("switches the main row quantity to available quantities and back to owned quantities", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Affichage"), { target: { value: "AVAILABLE" } });

    expect(screen.getByText("Quantité affichée (Disponibles)")).toBeTruthy();
    expect(quantityCellsForCard("Énergie prismatique").selected.textContent).toBe("3");
    expect(quantityCellsForCard("Énergie prismatique").binderReserved.textContent).toBe("1");

    fireEvent.change(screen.getByLabelText("Affichage"), { target: { value: "OWNED" } });

    expect(screen.getByText("Quantité affichée (Possédées)")).toBeTruthy();
    expect(quantityCellsForCard("Énergie prismatique").selected.textContent).toBe("4");
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
    ["Variante", "SHOWCASE", ["Lux dorée"]],
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

  it("combines filters to narrow the rendered rows", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "rba" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "GAMEPLAY" } });
    fireEvent.change(screen.getByLabelText("Variante"), { target: { value: "SHOWCASE" } });
    fireEvent.change(screen.getByLabelText("Statut"), { target: { value: "OWNED" } });

    expectVisibleCards(["Lux dorée"]);
  });

  it("keeps search filtering stable after switching display modes", () => {
    renderFilters();

    fireEvent.change(screen.getByLabelText("Affichage"), { target: { value: "AVAILABLE" } });
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
