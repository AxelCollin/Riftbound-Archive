import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders the brand and persistent main navigation", () => {
    render(
      <AppShell>
        <p>Contenu de page</p>
      </AppShell>,
    );

    expect(screen.getAllByText("Riftbound Archive").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Collection" })).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: "Binder" })).toHaveAttribute("href", "/binder");
    expect(screen.getByRole("link", { name: "Decks" })).toHaveAttribute("href", "/decks");
    expect(screen.getByRole("link", { name: "Boosters" })).toHaveAttribute("href", "/boosters");
  });

  it("renders page children inside the shell main content area", () => {
    render(
      <AppShell>
        <section aria-label="Page test">Contenu enfant</section>
      </AppShell>,
    );

    expect(screen.getByLabelText("Page test")).toHaveTextContent("Contenu enfant");
  });
});
