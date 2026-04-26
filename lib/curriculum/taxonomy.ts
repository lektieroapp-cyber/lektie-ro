// Skill taxonomy for the parent-dashboard mastery view. Stable IDs that
// survive prompt rewrites + Danish/English wording drift, so the analyze
// endpoint can write a consistent value across many sessions and the
// overview page can aggregate without string-matching on free-form names.
//
// Aligned to Fælles Mål domains within each subject. Coverage is
// intentionally MVP-shaped: ~10–14 skills per subject covering grades
// 1–7. Add more as we observe kids touching topics that don't fit.
//
// ID convention: <subject>.<domain>.<skill>
//   subject = matematik|dansk|engelsk|tysk
//   domain  = stable Danish keyword (tal, geom, stat, laesning, ...)
//   skill   = stable Danish keyword
// Use kebab-case in the skill segment when multi-word.

import type { Subject } from "./types"

export type SkillSignal = "solid" | "struggle"

export type Skill = {
  id: string
  label: string         // Danish display label, kid-facing
  domain: string        // Danish domain label, used for grouping in the UI
  grades: number[]      // grade levels (1–9) where this skill typically appears
}

// ─── matematik ──────────────────────────────────────────────────────────────

const MATEMATIK: Skill[] = [
  { id: "matematik.tal.taelle",         label: "Tælle og talrække",         domain: "Tal og algebra",            grades: [1, 2] },
  { id: "matematik.tal.add",            label: "Addition",                  domain: "Tal og algebra",            grades: [1, 2, 3, 4] },
  { id: "matematik.tal.add-veksling",   label: "Addition med veksling",     domain: "Tal og algebra",            grades: [2, 3, 4] },
  { id: "matematik.tal.sub",            label: "Subtraktion",               domain: "Tal og algebra",            grades: [1, 2, 3, 4] },
  { id: "matematik.tal.sub-veksling",   label: "Subtraktion med veksling",  domain: "Tal og algebra",            grades: [2, 3, 4] },
  { id: "matematik.tal.multi",          label: "Multiplikation",            domain: "Tal og algebra",            grades: [2, 3, 4, 5] },
  { id: "matematik.tal.tabeller",       label: "Gangetabeller",             domain: "Tal og algebra",            grades: [3, 4, 5] },
  { id: "matematik.tal.div",            label: "Division",                  domain: "Tal og algebra",            grades: [3, 4, 5, 6] },
  { id: "matematik.tal.brok",           label: "Brøker",                    domain: "Tal og algebra",            grades: [3, 4, 5, 6, 7] },
  { id: "matematik.tal.decimal",        label: "Decimaltal",                domain: "Tal og algebra",            grades: [4, 5, 6, 7] },
  { id: "matematik.tal.procent",        label: "Procent",                   domain: "Tal og algebra",            grades: [5, 6, 7] },
  { id: "matematik.tal.negative",       label: "Negative tal",              domain: "Tal og algebra",            grades: [6, 7] },
  { id: "matematik.alg.ligning",        label: "Ligninger",                 domain: "Tal og algebra",            grades: [6, 7] },
  { id: "matematik.geom.former",        label: "Geometriske former",        domain: "Geometri og måling",        grades: [1, 2, 3, 4] },
  { id: "matematik.geom.areal",         label: "Areal og omkreds",          domain: "Geometri og måling",        grades: [3, 4, 5, 6] },
  { id: "matematik.geom.vinkel",        label: "Vinkler",                   domain: "Geometri og måling",        grades: [4, 5, 6, 7] },
  { id: "matematik.geom.koord",         label: "Koordinatsystem",           domain: "Geometri og måling",        grades: [5, 6, 7] },
  { id: "matematik.maaling.laengde",    label: "Måling: længde",            domain: "Geometri og måling",        grades: [2, 3, 4, 5] },
  { id: "matematik.maaling.tid",        label: "Måling: tid (klokken)",     domain: "Geometri og måling",        grades: [2, 3, 4] },
  { id: "matematik.maaling.penge",      label: "Måling: penge",             domain: "Geometri og måling",        grades: [2, 3, 4] },
  { id: "matematik.stat.aflaesning",    label: "Aflæsning af data",         domain: "Statistik og sandsynlighed", grades: [3, 4, 5, 6, 7] },
  { id: "matematik.stat.middel",        label: "Middelværdi/median",        domain: "Statistik og sandsynlighed", grades: [5, 6, 7] },
  { id: "matematik.stat.sandsynlighed", label: "Sandsynlighed",             domain: "Statistik og sandsynlighed", grades: [5, 6, 7] },
  { id: "matematik.problem.tekstopgave", label: "Tekstopgaver (læsning)",   domain: "Problemløsning",            grades: [2, 3, 4, 5, 6, 7] },
]

// ─── dansk ──────────────────────────────────────────────────────────────────

const DANSK: Skill[] = [
  { id: "dansk.laesning.afkodning",   label: "Afkodning og lydanalyse",       domain: "Læsning",      grades: [1, 2, 3] },
  { id: "dansk.laesning.flydende",    label: "Flydende læsning",              domain: "Læsning",      grades: [2, 3, 4, 5] },
  { id: "dansk.laesning.forstaaelse", label: "Læseforståelse",                domain: "Læsning",      grades: [3, 4, 5, 6, 7] },
  { id: "dansk.skrift.bogstaver",     label: "Bogstavformning og håndskrift", domain: "Skrift",       grades: [1, 2, 3] },
  { id: "dansk.skrift.staevning",     label: "Stavning",                      domain: "Skrift",       grades: [2, 3, 4, 5, 6, 7] },
  { id: "dansk.skrift.tegnsaetning",  label: "Tegnsætning",                   domain: "Skrift",       grades: [3, 4, 5, 6, 7] },
  { id: "dansk.skrift.kommatering",   label: "Kommatering",                   domain: "Skrift",       grades: [4, 5, 6, 7] },
  { id: "dansk.skrift.tekster",       label: "Skrive sammenhængende tekst",   domain: "Skrift",       grades: [3, 4, 5, 6, 7] },
  { id: "dansk.gram.ordklasser",      label: "Ordklasser",                    domain: "Sprog og grammatik", grades: [3, 4, 5, 6, 7] },
  { id: "dansk.gram.tider",           label: "Verbets tider (datid/nutid)",   domain: "Sprog og grammatik", grades: [3, 4, 5, 6, 7] },
  { id: "dansk.gram.tillaegsord",     label: "Tillægsord",                    domain: "Sprog og grammatik", grades: [3, 4, 5] },
  { id: "dansk.gram.udsagnsord",      label: "Udsagnsord",                    domain: "Sprog og grammatik", grades: [3, 4, 5] },
  { id: "dansk.gram.naveord",         label: "Navneord",                      domain: "Sprog og grammatik", grades: [3, 4, 5] },
  { id: "dansk.fortolk.tema",         label: "Temaforståelse i tekster",      domain: "Fortolkning",  grades: [4, 5, 6, 7] },
  { id: "dansk.fortolk.argumentation", label: "Argumentation",                domain: "Fortolkning",  grades: [5, 6, 7] },
]

// ─── engelsk ────────────────────────────────────────────────────────────────

const ENGELSK: Skill[] = [
  { id: "engelsk.ord.basis",          label: "Basisordforråd",                domain: "Ordforråd",            grades: [3, 4, 5, 6, 7] },
  { id: "engelsk.ord.tema",           label: "Tematisk ordforråd",            domain: "Ordforråd",            grades: [4, 5, 6, 7] },
  { id: "engelsk.gram.tider",         label: "Verbets tider (tense)",         domain: "Grammatik",            grades: [4, 5, 6, 7] },
  { id: "engelsk.gram.uregelmaessige", label: "Uregelmæssige verber",         domain: "Grammatik",            grades: [5, 6, 7] },
  { id: "engelsk.gram.spoergsmal",    label: "Spørgsmålsord og spørgsmålsformer", domain: "Grammatik",        grades: [4, 5, 6, 7] },
  { id: "engelsk.gram.artikler",      label: "Artikler (a/an/the)",           domain: "Grammatik",            grades: [4, 5, 6] },
  { id: "engelsk.skrift.saetninger",  label: "Sætningsbygning",               domain: "Skriftlig kommunikation", grades: [4, 5, 6, 7] },
  { id: "engelsk.skrift.staevning",   label: "Stavning",                      domain: "Skriftlig kommunikation", grades: [3, 4, 5, 6, 7] },
  { id: "engelsk.tale.udtale",        label: "Udtale",                        domain: "Mundtlig kommunikation", grades: [3, 4, 5, 6, 7] },
  { id: "engelsk.tale.dialog",        label: "Dialog og forståelse",          domain: "Mundtlig kommunikation", grades: [4, 5, 6, 7] },
  { id: "engelsk.kultur",             label: "Kultur og samfund",             domain: "Kultur og samfund",    grades: [5, 6, 7] },
]

// ─── tysk ───────────────────────────────────────────────────────────────────

const TYSK: Skill[] = [
  { id: "tysk.ord.basis",             label: "Basisordforråd",                domain: "Ordforråd",            grades: [5, 6, 7] },
  { id: "tysk.ord.tema",              label: "Tematisk ordforråd",            domain: "Ordforråd",            grades: [5, 6, 7] },
  { id: "tysk.gram.tider",            label: "Verbets tider",                 domain: "Grammatik",            grades: [5, 6, 7] },
  { id: "tysk.gram.kasus",            label: "Kasus (nominativ/akkusativ/dativ)", domain: "Grammatik",        grades: [6, 7] },
  { id: "tysk.gram.koen",             label: "Substantivers køn",             domain: "Grammatik",            grades: [5, 6, 7] },
  { id: "tysk.skrift.saetninger",     label: "Sætningsbygning",               domain: "Skriftlig kommunikation", grades: [5, 6, 7] },
  { id: "tysk.tale.udtale",           label: "Udtale",                        domain: "Mundtlig kommunikation", grades: [5, 6, 7] },
  { id: "tysk.tale.dialog",           label: "Dialog og forståelse",          domain: "Mundtlig kommunikation", grades: [5, 6, 7] },
  { id: "tysk.kultur",                label: "Kultur og samfund",             domain: "Kultur og samfund",    grades: [6, 7] },
]

// ─── public surface ─────────────────────────────────────────────────────────

const TAXONOMY: Record<Subject, Skill[]> = {
  matematik: MATEMATIK,
  dansk:     DANSK,
  engelsk:   ENGELSK,
  tysk:      TYSK,
}

// Flat lookup so the parent page can resolve a skill_id from any subject
// without needing to know which subject it belongs to.
const SKILL_BY_ID: Map<string, Skill & { subject: Subject }> = new Map()
for (const subject of Object.keys(TAXONOMY) as Subject[]) {
  for (const skill of TAXONOMY[subject]) {
    SKILL_BY_ID.set(skill.id, { ...skill, subject })
  }
}

export function getSkillsForSubject(subject: string): Skill[] {
  const key = (subject ?? "").toLowerCase() as Subject
  return TAXONOMY[key] ?? []
}

export function getSkillsForSubjectAndGrade(
  subject: string,
  grade: number | null | undefined
): Skill[] {
  const all = getSkillsForSubject(subject)
  if (grade == null) return all
  // Include skills targeted at this grade ± 1 so we don't miss the kid
  // working on a slightly-ahead or slightly-behind topic.
  return all.filter(s =>
    s.grades.some(g => Math.abs(g - grade) <= 1)
  )
}

export function lookupSkill(id: string): (Skill & { subject: Subject }) | null {
  return SKILL_BY_ID.get(id) ?? null
}

export function listAllSkillIds(): string[] {
  return [...SKILL_BY_ID.keys()]
}
