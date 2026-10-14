import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  updated: string;
  intro: ReactNode;
  relatedTo: "/privacy" | "/terms";
  relatedLabel: string;
  children: ReactNode;
};

/**
 * Shared shell for the InstaQuote legal documents: sticky back bar that returns
 * to Business Settings, a single readable column, and cross-links between docs.
 */
export function LegalPage({
  title,
  updated,
  intro,
  relatedTo,
  relatedLabel,
  children,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="app-safe-header sticky top-0 z-10 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[42rem] items-center gap-3 px-4 py-3">
          <Link
            to="/"
            search={{ settings: "1" }}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-card px-3 text-sm font-semibold ring-1 ring-line active:translate-y-0.5"
          >
            <span aria-hidden="true">←</span>
            Back to settings
          </Link>
          <span className="label-mono ml-auto truncate tracking-[0.22em]">InstaQuote</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[42rem] px-4 pb-16 pt-7">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="label-mono mt-2.5">Last updated: {updated}</p>
        <p className="mt-4 text-sm leading-relaxed text-inksoft">{intro}</p>

        <div className="mt-9 space-y-8">{children}</div>

        <footer className="mt-12 border-t border-line pt-6">
          <nav aria-label="Related documents" className="flex flex-wrap gap-3">
            <Link
              to={relatedTo}
              className="min-h-11 rounded-xl bg-card px-4 text-sm font-semibold ring-1 ring-line active:translate-y-0.5 inline-flex items-center"
            >
              {relatedLabel}
            </Link>
            <Link
              to="/"
              search={{ settings: "1" }}
              className="min-h-11 rounded-xl px-4 text-sm font-semibold underline underline-offset-4 inline-flex items-center"
            >
              Back to settings
            </Link>
          </nav>
          <p className="mt-4 text-xs leading-relaxed text-inksoft">
            InstaQuote — the voice-to-quote app for contractors and trade workers.
          </p>
        </footer>
      </main>
    </div>
  );
}

export function LegalSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-base font-bold tracking-tight">
        {heading}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
