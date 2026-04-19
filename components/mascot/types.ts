export type CompanionMood =
  | "happy"
  | "excited"
  | "curious"
  | "thinking"
  | "cheer"
  | "wonder"
  | "sleepy"

// Slugs are also the SVG filenames in public/mascots/.
// When adding a new companion: drop {type}.svg in public/mascots/ and add an
// entry to COMPANIONS below.
export type CompanionType =
  | "lion"
  | "fox"
  | "owl"
  | "panda"
  | "octopus"
  | "robot"
  | "unicorn"
  | "dragon"
  | "rabbit"
  | "alien"
  | "cat"
  | "polar-bear"

export type CompanionMeta = {
  type: CompanionType
  /** Danish species name — "Løve", "Ræv"... */
  species: string
  /** The companion's first name — "Dani", "Frida"... */
  name: string
  /** Short Danish personality blurb shown on the picker. */
  description: string
  /** Accent colour tint for the picker card. */
  accent: string
  accentSoft: string
  /** SVG filename under public/mascots/ — the file the kid's uploaded there. */
  file: string
}

export const COMPANIONS: CompanionMeta[] = [
  {
    type: "lion",
    species: "Løve",
    name: "Dani",
    description: "Modig og blid. Opmuntrer dig når du er i tvivl.",
    accent: "#E8A04A",
    accentSoft: "#FBE8C8",
    file: "lektiero-dani.svg",
  },
  {
    type: "fox",
    species: "Ræv",
    name: "Frida",
    description: "Kvik og nysgerrig. Elsker at finde snedige genveje.",
    accent: "#D67A3E",
    accentSoft: "#FBE4D0",
    file: "lektiero-frida.svg",
  },
  {
    type: "owl",
    species: "Ugle",
    name: "Uno",
    description: "Tænksom og rolig. Forklarer ting grundigt og i ro.",
    accent: "#8C7B9F",
    accentSoft: "#E8E1EF",
    file: "lektiero-uno.svg",
  },
  {
    type: "panda",
    species: "Panda",
    name: "Miko",
    description: "Hyggelig og tålmodig. Tager det aldrig personligt.",
    accent: "#4A4752",
    accentSoft: "#E8E4E8",
    file: "lektiero-miko.svg",
  },
  {
    type: "octopus",
    species: "Blæksprutte",
    name: "Bubba",
    description: "Legesyg multitasker. Har altid en arm til overs.",
    accent: "#C96B82",
    accentSoft: "#F7DDE3",
    file: "lektiero-bubba.svg",
  },
  {
    type: "robot",
    species: "Robot",
    name: "Nova",
    description: "Præcis og venlig. Tæller aldrig forkert, men lader dig prøve først.",
    accent: "#5C8BA8",
    accentSoft: "#DCEAF2",
    file: "lektiero-nova.svg",
  },
  {
    type: "unicorn",
    species: "Enhjørning",
    name: "Luna",
    description: "Blid og magisk. Forvandler svære opgaver til eventyr.",
    accent: "#D48CC0",
    accentSoft: "#F8E1F0",
    file: "lektiero-luna.svg",
  },
  {
    type: "dragon",
    species: "Drage",
    name: "Rex",
    description: "Sej og urokkelig. Spruder ild når du knækker en svær opgave.",
    accent: "#5FA36B",
    accentSoft: "#DDEEDF",
    file: "lektiero-rex.svg",
  },
  {
    type: "rabbit",
    species: "Kanin",
    name: "Pip",
    description: "Sød og tillidsfuld. Hopper af glæde hver gang du forstår noget.",
    accent: "#E8A4A0",
    accentSoft: "#FBE3E0",
    file: "lektiero-pip.svg",
  },
  {
    type: "alien",
    species: "Rumvæsen",
    name: "Zap",
    description: "Nysgerrig og vild. Stiller tossede spørgsmål der hjælper dig videre.",
    accent: "#7ABDA4",
    accentSoft: "#DFEFE8",
    file: "lektiero-zap.svg",
  },
  {
    type: "cat",
    species: "Kat",
    name: "Kaja",
    description: "Cool og uafhængig. Hjælper dig på din måde, ikke hendes.",
    accent: "#A68B68",
    accentSoft: "#EEE3D4",
    file: "lektiero-kaja.svg",
  },
  {
    type: "polar-bear",
    species: "Isbjørn",
    name: "Bjørn",
    description: "Stærk og rolig. Kan bære alle de svære tanker sammen med dig.",
    accent: "#8FA8BC",
    accentSoft: "#E2EAF1",
    file: "lektiero-bjørn.svg",
  },
]

// Default companion when a kid hasn't picked one — Dani the lion is the
// brand mascot (featured in marketing demos), so new kids land there and
// can switch later via the avatar picker.
export const DEFAULT_COMPANION: CompanionType = "lion"

export function companionByType(type: CompanionType): CompanionMeta {
  return COMPANIONS.find(c => c.type === type) ?? COMPANIONS[0]
}
