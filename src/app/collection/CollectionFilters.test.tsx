import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("./actions", () => ({
  updateCollectionQuantityAction: vi.fn(),
}));

import { CollectionFilters } from "./CollectionFilters";
import type { CollectionDisplayRow } from "@/lib/domain/collection-display";

function row(overrides: Partial<CollectionDisplayRow> = {}): CollectionDisplayRow {
  return {
    rowId: "aatrox",
    cardId: "aatrox",
    cardName: "Aatrox",
    officialImageUrl: null,
    setCode: "ORG",
    setName: "Origines",
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    collectorCategory: "STANDARD",
    factions: ["FURY"],
    normalOwnedQuantity: 2,
    normalBinderReservedQuantity: 1,
    normalAvailableQuantity: 1,
    normalEditableQuantity: 2,
    normalEditable: true,
    foilOwnedQuantity: 0,
    foilBinderReservedQuantity: 0,
    foilAvailableQuantity: 0,
    foilEditableQuantity: 0,
    foilEditable: true,
    legacyShowcaseOwnedQuantity: 0,
    legacyShowcaseBinderReservedQuantity: 0,
    legacyShowcaseAvailableQuantity: 0,
    totalOwnedQuantity: 2,
    totalBinderReservedQuantity: 1,
    totalAvailableQuantity: 1,
    ...overrides,
  };
}

describe("CollectionFilters direct quantity controls", () => {
  it("renders Normal and Foil edit controls in line view and disables decrements at zero", () => {
    render(<CollectionFilters rows={[row()]} />);

    expect(screen.getByLabelText("Ajouter 1 Normal à Aatrox")).toBeInTheDocument();
    expect(screen.getByLabelText("Retirer 1 Normal de Aatrox")).toBeEnabled();
    expect(screen.getByLabelText("Ajouter 1 Foil à Aatrox")).toBeInTheDocument();
    expect(screen.getByLabelText("Retirer 1 Foil de Aatrox")).toBeDisabled();
  });

  it("keeps legacy Showcase compatibility quantities read-only", () => {
    render(<CollectionFilters rows={[row({ legacyShowcaseOwnedQuantity: 1, legacyShowcaseAvailableQuantity: 1, totalOwnedQuantity: 3 })]} />);

    expect(screen.getByTestId("legacy-showcase-aatrox")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Showcase/)).not.toBeInTheDocument();
  });

  it("renders edit controls in grid and compact views", () => {
    render(<CollectionFilters rows={[row()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Grille" }));
    expect(screen.getByTestId("collection-grid-view")).toBeInTheDocument();
    expect(screen.getByLabelText("Ajouter 1 Normal à Aatrox")).toBeInTheDocument();
    expect(screen.getByLabelText("Retirer 1 Foil de Aatrox")).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Compact" }));
    expect(screen.getByTestId("collection-compact-view")).toBeInTheDocument();
    expect(screen.getByLabelText("Ajouter 1 Foil à Aatrox")).toBeInTheDocument();
  });
});
