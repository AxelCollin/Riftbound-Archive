import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { deckCardVariantPreferenceLabelsFr } from "@/lib/formatters/decks";
import type { DeckRequirementCardOption } from "@/lib/queries/decks";
import { DeckCardCatalog } from "./DeckCardCatalog";

const cardOptions: DeckRequirementCardOption[] = [
  option({ cardId: "aatrox", displayName: "Aatrox", setCode: "OGN", collectorNumber: "001", rarity: "COMMON", kind: "GAMEPLAY", allowedPreferences: ["ANY", "NORMAL", "FOIL"] }),
  option({ cardId: "energy", displayName: "Rune d'énergie", setCode: "ENE", collectorNumber: "E01", rarity: "UNKNOWN", kind: "ENERGY", allowedPreferences: ["ANY", "FOIL"] }),
  option({ cardId: "lux", displayName: "Lux illuminée", setCode: "OGN", collectorNumber: "055", rarity: "RARE", kind: "GAMEPLAY", allowedPreferences: ["ANY", "FOIL", "SHOWCASE"] }),
];

function option({
  cardId,
  displayName,
  setCode,
  collectorNumber,
  rarity,
  kind,
  allowedPreferences,
}: {
  cardId: string;
  displayName: string;
  setCode: string;
  collectorNumber: string;
  rarity: DeckRequirementCardOption["rarity"];
  kind: DeckRequirementCardOption["kind"];
  allowedPreferences: DeckRequirementCardOption["allowedPreferences"];
}): DeckRequirementCardOption {
  return {
    cardId,
    displayName,
    officialName: displayName,
    collectorNumber,
    rarity,
    kind,
    printTreatment: "REGULAR",
    hasShowcase: allowedPreferences.includes("SHOWCASE"),
    set: { code: setCode, name: setCode },
    allowedPreferences,
  };
}

describe("DeckCardCatalog", () => {
  it("filters catalog cards by display name", () => {
    render(<DeckCardCatalog action={vi.fn()} canAddCards cardOptions={cardOptions} preferenceLabels={deckCardVariantPreferenceLabelsFr} />);

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "lux" } });

    expect(screen.getByText("Lux illuminée")).toBeInTheDocument();
    expect(screen.queryByText("Aatrox")).not.toBeInTheDocument();
  });

  it("filters catalog cards by set code and collector number", () => {
    render(<DeckCardCatalog action={vi.fn()} canAddCards cardOptions={cardOptions} preferenceLabels={deckCardVariantPreferenceLabelsFr} />);

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "ENE" } });
    expect(screen.getByText("Rune d'énergie")).toBeInTheDocument();
    expect(screen.queryByText("Aatrox")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Recherche"), { target: { value: "055" } });
    expect(screen.getByText("Lux illuminée")).toBeInTheDocument();
    expect(screen.queryByText("Rune d'énergie")).not.toBeInTheDocument();
  });

  it("shows and filters rarity and kind information", () => {
    render(<DeckCardCatalog action={vi.fn()} canAddCards cardOptions={cardOptions} preferenceLabels={deckCardVariantPreferenceLabelsFr} />);

    expect(screen.getByText(/Rare · Gameplay/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Rareté"), { target: { value: "RARE" } });
    expect(screen.getByText("Lux illuminée")).toBeInTheDocument();
    expect(screen.queryByText("Aatrox")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Rareté"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "ENERGY" } });
    expect(screen.getByText("Rune d'énergie")).toBeInTheDocument();
    expect(screen.queryByText("Lux illuminée")).not.toBeInTheDocument();
  });

  it("exposes active catalog add controls only when the deck can be edited", () => {
    const { rerender } = render(<DeckCardCatalog action={vi.fn()} canAddCards cardOptions={cardOptions} preferenceLabels={deckCardVariantPreferenceLabelsFr} />);

    expect(screen.getAllByRole("button", { name: "Ajouter" })[0]).toBeEnabled();
    expect(within(screen.getByText("Aatrox").closest("form")!).getByLabelText("Quantité")).toBeEnabled();

    rerender(<DeckCardCatalog action={vi.fn()} canAddCards={false} cardOptions={cardOptions} preferenceLabels={deckCardVariantPreferenceLabelsFr} />);

    expect(screen.getByText(/il doit être désassemblé avant d’ajouter des cartes/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ajouter" })[0]).toBeDisabled();
    expect(within(screen.getByText("Aatrox").closest("form")!).getByLabelText("Quantité")).toBeDisabled();
  });
});
