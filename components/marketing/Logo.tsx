type Props = {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Logo({ size = "md", className = "" }: Props) {
  const fontSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl"
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-coral-deep/10 text-coral-deep"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
        </svg>
      </span>
      <span
        className={`${fontSize} font-semibold tracking-tight text-ink`}
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        Lektie<span className="text-coral-deep">Ro</span>
      </span>
    </span>
  )
}
