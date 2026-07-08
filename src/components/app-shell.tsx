import Link from "next/link";

const navigationItems = [
  { label: "Accueil", href: "/" },
  { label: "Collection", href: "/collection" },
  { label: "Binder", href: "/binder" },
  { label: "Decks", href: "/decks" },
  { label: "Boosters", href: "/boosters" },
] as const;

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_12%,rgba(58,123,213,0.18),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(199,168,102,0.12),transparent_24%),linear-gradient(135deg,var(--bg-950),var(--bg-900)_54%,#03060a)] text-archive-text100">
      <div className="mx-auto flex min-h-screen max-w-[var(--content-max)] flex-col gap-4 px-4 py-4 xl:flex-row lg:px-6 lg:py-6">
        <aside className="rounded-panel border border-[rgba(199,168,102,0.42)] bg-[rgba(8,17,27,0.9)] p-5 shadow-panel backdrop-blur xl:sticky xl:top-6 xl:h-[calc(100vh-48px)] xl:w-[var(--sidebar-w)] xl:shrink-0">
          <Link className="group block" href="/" aria-label="Riftbound Archive - Accueil">
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-archive-gold300">Archive</p>
            <p className="mt-3 text-2xl font-semibold text-archive-text100 transition group-hover:text-archive-gold300">
              Riftbound Archive
            </p>
            <p className="mt-2 text-sm leading-6 text-archive-text500">Collection locale · Decks · Boosters</p>
          </Link>

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-[rgba(199,168,102,0.45)] to-transparent" />

          <nav aria-label="Navigation principale" className="flex flex-wrap gap-2 xl:flex-col">
            {navigationItems.map((item) => (
              <Link
                className="rounded-chip border border-[rgba(199,168,102,0.28)] bg-[rgba(16,32,51,0.6)] px-4 py-2.5 text-sm font-semibold text-archive-text300 transition hover:border-archive-gold300 hover:bg-[rgba(199,168,102,0.12)] hover:text-archive-gold300 xl:rounded-card"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="rounded-panel border border-[rgba(199,168,102,0.28)] bg-[rgba(12,23,36,0.78)] px-5 py-4 shadow-panel backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-archive-gold300">Riftbound Archive</p>
              <p className="text-sm text-archive-text500">Application locale privée</p>
            </div>
          </header>

          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
