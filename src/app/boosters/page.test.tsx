import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getBoosterOverviewMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/boosters", () => ({
  getBoosterOverview: getBoosterOverviewMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("./actions", () => ({
  updateBoosterSettingsAction: vi.fn(),
}));

import BoostersPage from "./page";

async function renderPage(searchParams = {}) {
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
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Décrémenter le compteur/ })).toBeChecked();
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

  it("does not expose booster opening entry yet", async () => {
    await renderPage();

    expect(screen.queryByRole("button", { name: /Ouvrir un booster/i })).not.toBeInTheDocument();
    expect(screen.getByText("L’ouverture de boosters arrive dans une phase suivante.")).toBeInTheDocument();
  });
});
