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

function deck(overrides = {}) {
  return {
    deckId: "deck-1",
    name: "Deck Test",
    description: null,
    status: "ASSEMBLED" as const,
    allocationStrategy: "PRESERVE_PREMIUM_VARIANTS" as const,
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-02T10:00:00.000Z",
    requirements: [],
    allocations: [],
    cardOptions: [],
    summary: {
      requirementLineCount: 0,
      requiredCardQuantity: 0,
      allocationLineCount: 0,
      allocatedCardQuantity: 0,
    },
    missing: {
      summary: {
        requirementLineCount: 0,
        completeLineCount: 0,
        missingLineCount: 0,
        requiredCardQuantity: 0,
        satisfiedCardQuantity: 0,
        missingCardQuantity: 0,
        isComplete: true,
      },
      rows: [],
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

describe("DeckDetailPage disassemble action", () => {
  it("exposes an active disassemble action for ASSEMBLED decks", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(deck({ status: "ASSEMBLED" }));

    await renderPage();

    expect(screen.getByRole("button", { name: "Désassembler le deck" })).toBeEnabled();
  });

  it("does not expose an active disassemble action for THEORETICAL decks", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(deck({ status: "THEORETICAL" }));

    await renderPage();

    expect(screen.getByRole("button", { name: "Désassembler le deck" })).toBeDisabled();
    expect(screen.getByText("Seuls les decks assemblés peuvent être désassemblés.")).toBeInTheDocument();
  });

  it("shows French disassembly success and error feedback", async () => {
    getDeckDetailPageDataMock.mockResolvedValueOnce(deck());
    await renderPage({ disassembled: "1" });

    expect(screen.getByText(/Deck désassemblé avec succès/)).toBeInTheDocument();

    getDeckDetailPageDataMock.mockResolvedValueOnce(deck());
    await renderPage({ disassemblyError: "Only assembled decks can be disassembled." });

    expect(screen.getByText(/Désassemblage impossible/)).toBeInTheDocument();
  });
});
