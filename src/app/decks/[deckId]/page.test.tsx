import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getDeckDetailPageDataMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queries/decks", () => ({
  getDeckDetailPageData: getDeckDetailPageDataMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

vi.mock("../actions", () => ({
  addDeckRequirementAction: vi.fn(),
  assembleDeckAction: vi.fn(),
  deleteDeckRequirementAction: vi.fn(),
  disassembleDeckAction: vi.fn(),
  updateDeckRequirementAction: vi.fn(),
}));

import DeckDetailPage from "./page";

const requirement = {
  deckCardId: "deck-card-1",
  cardId: "card-1",
  displayName: "Aatrox",
  set: { code: "OGN" },
  collectorNumber: "001",
  rarity: "COMMON" as const,
  kind: "GAMEPLAY" as const,
  printTreatment: "STANDARD" as const,
  preferredVariant: "ANY" as const,
  allowedPreferences: ["ANY", "NORMAL", "FOIL"] as const,
  quantity: 2,
};

function deck(overrides = {}) {
  return {
    deckId: "deck-1",
    name: "Deck Test",
    description: null,
    status: "ASSEMBLED" as const,
    allocationStrategy: "PRESERVE_PREMIUM_VARIANTS" as const,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-02T10:00:00.000Z",
    requirements: [requirement],
    allocations: [],
    cardOptions: [
      {
        cardId: "card-1",
        displayName: "Aatrox",
        officialName: "Aatrox",
        set: { code: "OGN", name: "Origines" },
        collectorNumber: "001",
        rarity: "COMMON" as const,
        kind: "GAMEPLAY" as const,
        printTreatment: "REGULAR" as const,
        hasShowcase: false,
        allowedPreferences: ["ANY", "NORMAL", "FOIL"] as const,
      },
    ],
    summary: {
      requirementLineCount: 1,
      requiredCardQuantity: 2,
      allocationLineCount: 0,
      allocatedCardQuantity: 0,
    },
    missing: {
      summary: {
        requirementLineCount: 1,
        completeLineCount: 1,
        missingLineCount: 0,
        requiredCardQuantity: 2,
        satisfiedCardQuantity: 2,
        missingCardQuantity: 0,
        isComplete: true,
      },
      rows: [
        {
          cardId: "card-1",
          displayName: "Aatrox",
          set: { code: "OGN" },
          collectorNumber: "001",
          preferredVariant: "ANY" as const,
          requiredQuantity: 2,
          satisfiedQuantity: 2,
          missingQuantity: 0,
          usedVariants: [{ variant: "NORMAL" as const, quantity: 2 }],
        },
      ],
    },
    ...overrides,
  };
}

async function renderPage(searchParams = {}) {
  const ui = await DeckDetailPage({
    params: Promise.resolve({ deckId: "deck-1" }),
    searchParams: Promise.resolve(searchParams),
  });
  render(ui);
}

describe("DeckDetailPage deckbuilder catalog", () => {
  it("renders the key French deckbuilder catalog sections", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(
      deck({ status: "THEORETICAL" }),
    );

    await renderPage();

    expect(screen.getByText("Deckbuilder — Phase 6J")).toBeInTheDocument();
    expect(screen.getByText("Statut et actions")).toBeInTheDocument();
    expect(screen.getByText("Synthèse du deck")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Rechercher et ajouter une exigence" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Exigences du deck" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Disponibilité et cartes manquantes",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Allocations existantes" }),
    ).toBeInTheDocument();
  });

  it("shows an active requirement editing area for THEORETICAL decks", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(
      deck({ status: "THEORETICAL" }),
    );

    await renderPage();

    expect(screen.getAllByRole("button", { name: "Ajouter" })[0]).toBeEnabled();
    expect(screen.getByRole("button", { name: "Modifier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirer" })).toBeInTheDocument();
  });

  it("shows a read-only requirement area for ASSEMBLED decks", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(deck({ status: "ASSEMBLED" }));

    await renderPage();

    expect(screen.getAllByRole("button", { name: "Ajouter" })[0]).toBeDisabled();
    expect(
      screen.getByText(/doit être désassemblé avant d’ajouter des cartes/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/lecture seule et ne peuvent pas être modifiées/),
    ).toBeInTheDocument();
    expect(screen.getByText("Lecture seule")).toBeInTheDocument();
  });

  it("enables assemble only for THEORETICAL decks", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(
      deck({ status: "THEORETICAL" }),
    );
    await renderPage();

    expect(
      screen.getByRole("button", { name: "Assembler le deck" }),
    ).toBeEnabled();

    getDeckDetailPageDataMock.mockResolvedValueOnce(deck({ status: "ASSEMBLED" }));
    await renderPage();

    expect(
      screen.getAllByRole("button", { name: "Assembler le deck" }).at(-1),
    ).toBeDisabled();
    expect(
      screen.getByText("Seuls les decks théoriques peuvent être assemblés."),
    ).toBeInTheDocument();
  });

  it("enables disassemble only for ASSEMBLED decks", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(deck({ status: "ASSEMBLED" }));
    await renderPage();

    expect(
      screen.getByRole("button", { name: "Désassembler le deck" }),
    ).toBeEnabled();

    getDeckDetailPageDataMock.mockResolvedValueOnce(
      deck({ status: "THEORETICAL" }),
    );
    await renderPage();

    expect(
      screen.getAllByRole("button", { name: "Désassembler le deck" }).at(-1),
    ).toBeDisabled();
    expect(
      screen.getByText("Seuls les decks assemblés peuvent être désassemblés."),
    ).toBeInTheDocument();
  });

  it("keeps the read-only availability and missing-card section present", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(deck());

    await renderPage();

    expect(screen.getByText(/Lecture seule : cette section compare/)).toBeInTheDocument();
    expect(screen.getByText("Variantes utilisées")).toBeInTheDocument();
  });

  it("shows French assembly and disassembly success and error feedback", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(deck());
    await renderPage({ assembled: "1", assemblyError: "Missing cards" });

    expect(screen.getByText("Deck assemblé avec succès.")).toBeInTheDocument();
    expect(screen.getByText(/Assemblage impossible/)).toBeInTheDocument();

    getDeckDetailPageDataMock.mockResolvedValueOnce(deck());
    await renderPage({
      disassembled: "1",
      disassemblyError: "Only assembled decks can be disassembled.",
    });

    expect(screen.getByText(/Deck désassemblé avec succès/)).toBeInTheDocument();
    expect(screen.getByText(/Désassemblage impossible/)).toBeInTheDocument();
  });
});
