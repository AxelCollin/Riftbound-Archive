import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { deckCardVariantPreferenceLabelsFr } from "@/lib/formatters/decks";
import type { DeckRequirementCardOption } from "@/lib/queries/decks";
import { AddDeckRequirementForm } from "./AddDeckRequirementForm";

const cardOptions = [
  option("common", "Commune", ["ANY", "NORMAL", "FOIL"]),
  option("rare", "Rare", ["ANY", "FOIL"]),
  option("showcase", "Vitrine", ["ANY", "FOIL", "SHOWCASE"]),
];

function option(
  cardId: string,
  displayName: string,
  allowedPreferences: DeckRequirementCardOption["allowedPreferences"],
): DeckRequirementCardOption {
  return {
    cardId,
    displayName,
    officialName: displayName,
    collectorNumber: "001",
    rarity: "COMMON",
    kind: "GAMEPLAY",
    printTreatment: "REGULAR",
    hasShowcase: false,
    set: { code: "RBA", name: "Riftbound" },
    allowedPreferences,
  };
}

function preferenceValues() {
  const preferenceSelect = screen.getByLabelText("Préférence");
  return within(preferenceSelect).getAllByRole("option").map((preference) => preference.getAttribute("value"));
}

describe("AddDeckRequirementForm", () => {
  it("limits preferred variants to the selected card capabilities", () => {
    render(<AddDeckRequirementForm action={vi.fn()} cardOptions={cardOptions} preferenceLabels={deckCardVariantPreferenceLabelsFr} />);

    expect(preferenceValues()).toEqual(["ANY", "NORMAL", "FOIL"]);

    fireEvent.change(screen.getByLabelText("Carte"), { target: { value: "rare" } });
    expect(preferenceValues()).toEqual(["ANY", "FOIL"]);

    fireEvent.change(screen.getByLabelText("Carte"), { target: { value: "showcase" } });
    expect(preferenceValues()).toEqual(["ANY", "FOIL", "SHOWCASE"]);
  });

  it("exposes each card option allowed preferences for robust add controls", () => {
    render(<AddDeckRequirementForm action={vi.fn()} cardOptions={cardOptions} preferenceLabels={deckCardVariantPreferenceLabelsFr} />);

    expect(screen.getByRole("option", { name: /Commune/ }).getAttribute("data-allowed-preferences")).toBe("ANY,NORMAL,FOIL");
    expect(screen.getByRole("option", { name: /Rare/ }).getAttribute("data-allowed-preferences")).toBe("ANY,FOIL");
    expect(screen.getByRole("option", { name: /Vitrine/ }).getAttribute("data-allowed-preferences")).toBe("ANY,FOIL,SHOWCASE");
  });
});
