import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BrandGlyph } from "@/components/ui/BrandMark";
import { TargetIcon, SparklesIcon, BarChartIcon, ArrowRightIcon } from "@/components/ui/icons";

const FEATURES = [
  {
    icon: <TargetIcon className="h-5 w-5" />,
    title: "Structured workflow",
    body: "Every step of niche research — seed keywords, competitors, reverse-engineering — tracked in one place.",
  },
  {
    icon: <SparklesIcon className="h-5 w-5" />,
    title: "AI-assisted",
    body: "AI generates Ahrefs prompts, suggests keywords, and scores your final shortlist.",
  },
  {
    icon: <BarChartIcon className="h-5 w-5" />,
    title: "Never lose progress",
    body: "Leave and resume any niche at whatever step you left it.",
  },
];

const STEPS = [
  {
    title: "Start a niche",
    body: "Pick the country you're targeting in Ahrefs and create a new niche research.",
  },
  {
    title: "Get a seed-idea prompt",
    body: "AI writes a short prompt for ChatGPT or Claude, built around your rough idea (e.g. \"AI [Keyword]\") and your filters.",
  },
  {
    title: "Brainstorm with ChatGPT or Claude",
    body: "Paste the prompt in — it hands back a list of candidate keyword ideas to work through.",
  },
  {
    title: "Check each idea in Ahrefs",
    body: "Run every idea through Ahrefs Keywords Explorer with your filters (max DR of top 10, min volume, include text), then export the CSV.",
  },
  {
    title: "Upload the CSV",
    body: "NicheMine parses the export — Ahrefs/Semrush formats included — into a searchable table instantly.",
  },
  {
    title: "Pick the keyword",
    body: "Ask AI to suggest the most promising keyword from the table, or search and pick your own.",
  },
  {
    title: "Add competitor sites",
    body: "Find the 1-3 lowest-DR sites ranking for that keyword and add their URLs.",
  },
  {
    title: "Reverse-engineer each site",
    body: "Enter each competitor's Ahrefs metrics — organic/paid traffic, top keywords — and let AI review them.",
  },
  {
    title: "Finalize the niche",
    body: "When you're ready, AI scores the niche and adds a summary to your final shortlist.",
  },
];

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative flex min-h-screen flex-col px-4">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-40" />
        <div className="glow-orb animate-float-slow absolute left-1/2 top-1/4 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 [--glow:color-mix(in_srgb,var(--color-accent)_14%,transparent)]" />
      </div>

      <header className="glass sticky top-0 z-30 -mx-4 px-4 py-4 sm:mx-0 sm:rounded-b-2xl sm:px-6">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-3 items-center">
        <span className="flex items-center gap-2.5 justify-self-start">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent-bright">
            <BrandGlyph size={16} />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">
            Niche<span className="text-accent">Mine</span>
          </span>
        </span>

        <nav className="hidden items-center gap-6 justify-self-center sm:flex">
          <a href="#how-it-works" className="text-sm text-muted transition-colors hover:text-foreground">
            How it works
          </a>
          <a
            href="https://www.cybrumsolutions.dev/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </nav>

        <div className="flex items-center gap-3 justify-self-end">
          <ThemeToggle />
          {user ? (
            <Link
              href="/dashboard"
              title="Go to your dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent-bright transition-colors hover:bg-accent/25"
            >
              {(user.email ?? "?").charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline" type="button">
                Log in
              </Button>
            </Link>
          )}
        </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 py-16 text-center">
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Find niches that are <span className="text-gradient">low-competition</span> and high-volume
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted">
            A structured workflow for Ahrefs-based niche research, with AI helping you generate prompts, pick
            keywords, and score the final shortlist.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button variant="primary" type="button">
                <span className="inline-flex items-center gap-2">
                  Enter Workspace
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button variant="primary" type="button">
                  Sign up
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" type="button">
                  Log in
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent-bright">
                {f.icon}
              </span>
              <p className="mt-3 font-heading text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-xs text-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </main>

      <section id="how-it-works" className="mx-auto w-full max-w-3xl scroll-mt-10 py-10">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
            NicheMine doesn&apos;t automate Ahrefs — you still do the research by hand. It structures every step,
            stores your data, and uses AI to help along the way.
          </p>
        </div>

        <Card className="mt-8 text-left">
          <p className="font-heading text-sm font-semibold text-accent-bright">Why &ldquo;NicheMine&rdquo;?</p>
          <p className="mt-2 text-sm text-muted">
            Mining is digging through a lot of ordinary rock to find the rare vein of gold underneath — you don&apos;t
            strike it on the surface, and you don&apos;t strike it by luck either. You follow the data, test the
            ground, and rule out where <em>not</em> to dig. Keyword research works the same way: inside a huge
            Ahrefs export, most keywords are already claimed by sites with real authority — but a few are still
            low-competition and high-volume, sitting there unclaimed. NicheMine is the tool for that dig. It
            doesn&apos;t do the digging for you — you still swing the pickaxe in Ahrefs — but it tracks every seed
            keyword, every competitor you check, and every vein that actually pans out, so nothing gets lost while
            you work the site.
          </p>
        </Card>

        <ol className="mt-6 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Card className="flex items-start gap-4 text-left" padding="md">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-heading text-sm font-semibold text-accent-bright">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm text-muted">{step.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 py-8 text-center text-xs text-muted sm:flex-row sm:justify-between">
        <span>
          A product by{" "}
          <a
            href="https://www.cybrumsolutions.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-bright transition-colors hover:text-accent"
          >
            Cybrum Solutions
          </a>
        </span>
        <a
          href="https://www.cybrumsolutions.dev/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-bright transition-colors hover:text-accent"
        >
          Contact us →
        </a>
      </footer>
    </div>
  );
}
