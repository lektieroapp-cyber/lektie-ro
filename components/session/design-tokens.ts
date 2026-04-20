// Design tokens for the kid homework flow. Aligned to Color System v3:
// mint is a quiet brand, ink is voice, clay is the ONE warm accent per screen.
// Subjects share the same palette — differentiate via icon + name, not colour.
//
// Historical names (`coral`, `butter`, `mint`, `dansk`, `engelsk`) are kept as
// aliases so the wider codebase doesn't need a mass rename. Values now map to
// the harmonised palette.

export const K = {
  // Surfaces
  bg: "#F5EDDE",          // cream — app background (warmer than v2)
  bg2: "#EDE2CD",         // cream-deep — section shift, subtle divider
  card: "#FFFFFF",

  // Text
  ink: "#1F2D1A",
  ink2: "#556048",
  ink3: "#8A9280",

  // Brand — mint. `coral` is a legacy alias; value is mint primary.
  coral: "#7ACBA2",
  coralSoft: "#E4F2EB",
  mint: "#7ACBA2",
  mintSoft: "#E4F2EB",
  mintDeep: "#4F8E6B",    // darker than v2 — passes AA on cream
  mintEdge: "#C5E3D1",    // border on mint-soft

  // Forest — dark reassurance band
  forest: "#1E3526",

  // One warm accent — clay (terracotta). Max 1 use per screen.
  action: "#C97962",
  actionSoft: "#F4DBD1",
  clay: "#C97962",
  claySoft: "#F4DBD1",

  // Legacy "butter" / "sand" aliases — collapsed to warm-neutral cream-2.
  butter: "#EDE2CD",
  butterSoft: "#F5EDDE",
  sand: "#EDE2CD",
  sandSoft: "#F5EDDE",

  // Legacy subject aliases — collapsed to mint-edge (same for every subject).
  sky: "#C5E3D1",
  skySoft: "#E4F2EB",
  dansk: "#C5E3D1",
  danskSoft: "#E4F2EB",
  engelsk: "#C5E3D1",
  engelskSoft: "#E4F2EB",

  // Plum — retired as brand token, kept minimally for any decorative leftover
  // (e.g. BreakTimer). Prefer clay for focus; plum should fade out over time.
  plum: "#B89FCF",
  plumSoft: "#EFE6F5",

  serif: "var(--font-fraunces), Georgia, serif",
  sans: "var(--font-nunito), var(--font-inter), ui-sans-serif, system-ui, sans-serif",

  shadowCard:
    "0 1px 0 rgba(31,45,26,0.04), 0 12px 32px -12px rgba(31,45,26,0.12)",
  shadowCardLg: "0 20px 48px -12px rgba(31,45,26,0.22)",
} as const

export type SubjectKey = "matematik" | "dansk" | "engelsk"

// v3 rule: subjects share the same palette. The tint/dot are identical;
// the subject picker distinguishes via icon + label, not colour.
export const SUBJECT_PALETTE: Record<SubjectKey, { tint: string; dot: string; ink: string }> = {
  matematik: { tint: K.mintSoft, dot: K.mintEdge, ink: K.ink },
  dansk: { tint: K.mintSoft, dot: K.mintEdge, ink: K.ink },
  engelsk: { tint: K.mintSoft, dot: K.mintEdge, ink: K.ink },
}
