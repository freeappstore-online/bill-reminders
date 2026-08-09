import type { ReactNode } from "react";

type Page = "home" | "bills";

interface ShellProps {
  children: ReactNode;
  page: Page;
  onNavigate: (p: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "bills", label: "Bills", icon: "💸" },
];

export function Shell({ children, page, onNavigate }: ShellProps) {
  return (
    <>
      {/* ── Desktop ── */}
      <div className="hidden md:flex h-screen">
        <aside
          className="flex flex-col border-r h-full shrink-0"
          style={{ width: "17rem", borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <div className="px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>App</p>
            <span className="font-bold text-xl" style={{ fontFamily: "Fraunces, serif" }}>
              Bill Reminders
            </span>
          </div>

          <nav className="flex-1 px-3 flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[0.75rem] text-sm font-semibold w-full text-left transition-colors"
                style={{
                  background: page === item.id ? "var(--accent)" : "transparent",
                  color: page === item.id ? "#fff" : "var(--muted)",
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 text-xs" style={{ color: "var(--muted)" }}>
            <a
              href="https://freeappstore.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--muted)" }}
            >
              Part of FreeAppStore — free forever
            </a>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>

      {/* ── Mobile ── */}
      <div className="flex flex-col h-screen md:hidden">
        <header
          className="flex items-center px-4 h-14 border-b shrink-0"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <span className="font-bold" style={{ fontFamily: "Fraunces, serif" }}>Bill Reminders</span>
        </header>

        <main className="flex-1 overflow-auto p-4">{children}</main>

        <nav
          className="flex items-center justify-around h-16 border-t shrink-0"
          style={{ borderColor: "var(--line)", background: "var(--dock)" }}
        >
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-0.5 px-6 py-1"
            >
              <span className="text-xl">{item.icon}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: page === item.id ? "var(--accent)" : "var(--muted)" }}
              >
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
