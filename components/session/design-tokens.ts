// Design tokens for the kid homework flow. Matches the Claude Design prototype
// exactly. Scoped to child surfaces — do not propagate to marketing/admin.

export const K = {
  bg: "#F5F1EA",
  bg2: "#EFE8DC",
  card: "#FFFFFF",
  ink: "#1F1B33",
  ink2: "#6B6680",
  ink3: "#A8A2B8",

  coral: "#E8846A",
  coralSoft: "#FDEAE2",
  sky: "#B8D4E8",
  skySoft: "#E6F0F7",
  mint: "#A8D8C0",
  mintSoft: "#E4F2EB",
  butter: "#F4D77A",
  butterSoft: "#FBF1CF",
  plum: "#B89FCF",
  plumSoft: "#EFE6F5",

  serif: "var(--font-fraunces), Georgia, serif",
  sans: "var(--font-nunito), var(--font-inter), ui-sans-serif, system-ui, sans-serif",

  shadowCard:
    "0 1px 0 rgba(31,27,51,0.04), 0 12px 32px -12px rgba(31,27,51,0.12)",
  shadowCardLg: "0 20px 48px -12px rgba(31,27,51,0.22)",
} as const

export type SubjectKey = "matematik" | "dansk" | "engelsk"

export const SUBJECT_PALETTE: Record<SubjectKey, { tint: string; dot: string; ink: string }> = {
  matematik: { tint: K.skySoft, dot: K.sky, ink: "#3A5F7A" },
  dansk: { tint: K.mintSoft, dot: K.mint, ink: "#3E8A6A" },
  engelsk: { tint: K.butterSoft, dot: K.butter, ink: "#7A5A10" },
}
