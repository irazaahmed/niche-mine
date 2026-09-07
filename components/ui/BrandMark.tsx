/**
 * The NicheMine brand mark: a compass/target glyph in the Cybrum Solutions
 * accent chip, so the icon reads as "finding a niche". Kept in one place so
 * every surface (sidebar, login, admin) draws the identical mark.
 * `currentColor` drives the glyph, so callers set the color via text color.
 */
export function BrandGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21" />
    </svg>
  );
}

/**
 * Full lockup used in the header and login screen: the glyph in a soft
 * accent chip next to the "NicheMine" wordmark. Not a link itself — callers
 * wrap it.
 */
export function BrandLockup({ chip = 36, glyph = 18 }: { chip?: number; glyph?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex items-center justify-center rounded-xl bg-accent/15 text-accent-bright transition-colors group-hover:bg-accent/25"
        style={{ width: chip, height: chip }}
      >
        <BrandGlyph size={glyph} />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">
        Niche<span className="text-accent">Mine</span>
      </span>
    </span>
  );
}
