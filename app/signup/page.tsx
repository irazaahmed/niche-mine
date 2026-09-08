import Link from "next/link";
import { signup } from "@/lib/auth/actions";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BrandGlyph } from "@/components/ui/BrandMark";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";

const inputClass =
  "w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-foreground placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] duration-300 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_18%,transparent)]";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkEmail?: string }>;
}) {
  const { error, checkEmail } = await searchParams;

  if (checkEmail) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
          <div className="absolute inset-0 bg-grid-lines opacity-40" />
          <div className="glow-orb animate-float-slow absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 [--glow:color-mix(in_srgb,var(--color-accent)_14%,transparent)]" />
        </div>

        <Link
          href="/"
          className="fixed left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-foreground sm:left-6 sm:top-6"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
          </svg>
          Back to home
        </Link>

        <div className="glass w-full max-w-sm rounded-3xl p-8 text-center shadow-[0_24px_70px_-30px_var(--color-accent)]">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-bright">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 4h16v16H4z" opacity="0" />
              <path d="M3 7l9 6 9-6" />
              <rect x="3" y="5" width="18" height="14" rx="2" />
            </svg>
          </span>
          <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-3 text-sm text-muted">
            We sent a verification link to <span className="font-medium text-foreground">{checkEmail}</span>. Click
            it to activate your account, then come back and log in.
          </p>
          <p className="mt-4 text-xs text-muted">
            Don&apos;t see it? Check spam, or{" "}
            <Link href="/signup" className="text-accent-bright hover:underline">
              try signing up again
            </Link>
            .
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <span className="btn-sheen inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)]">
              Go to login
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-lines opacity-40" />
        <div className="glow-orb animate-float-slow absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 [--glow:color-mix(in_srgb,var(--color-accent)_14%,transparent)]" />
      </div>

      <Link
        href="/"
        className="fixed left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted transition-colors hover:text-foreground sm:left-6 sm:top-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
        </svg>
        Back to home
      </Link>

      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center shadow-[0_24px_70px_-30px_var(--color-accent)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent-bright">
          <BrandGlyph size={22} />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
          Niche<span className="text-accent">Mine</span>
        </h1>
        <p className="mt-2 text-sm text-muted">Create an account to start finding niches.</p>

        <div className="mt-7">
          <GoogleSignInButton />
        </div>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={signup} className="flex flex-col gap-4 text-left">
          <input type="email" name="email" required placeholder="Email address" className={inputClass} />
          <input
            type="password"
            name="password"
            required
            minLength={6}
            placeholder="Password (min. 6 characters)"
            className={inputClass}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <FormSubmitButton pendingLabel="Creating account…">Create account</FormSubmitButton>
        </form>

        <p className="mt-6 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-bright hover:underline">
            Log in
          </Link>
        </p>

        <p className="mt-6 text-xs text-muted">
          A product by{" "}
          <a
            href="https://www.cybrumsolutions.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-bright transition-colors hover:text-accent"
          >
            Cybrum Solutions
          </a>
        </p>
      </div>
    </div>
  );
}
