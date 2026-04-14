// Central registry of every email LektieRo ever sends. Two buckets:
//
//   - "supabase": managed in Supabase dashboard → Auth → Email Templates.
//     We author the HTML here so we can keep brand consistency, and the
//     admin page provides a copy-paste button to ship it to Supabase.
//     Supabase substitutes the `{{ .Foo }}` variables at send time.
//   - "lektiero": sent by our own code via Resend (lib/email.ts). We own
//     everything — trigger, HTML, and send.
//
// Status reflects what's wired today vs what's planned.

export type EmailTemplateOwner = "supabase" | "lektiero"
export type EmailTemplateStatus = "live" | "planned"

export type EmailTemplate = {
  id: string
  name: string
  description: string
  subject: string
  owner: EmailTemplateOwner
  status: EmailTemplateStatus
  /** URL into the Supabase dashboard to edit, when owner === "supabase". */
  editUrl?: string
  /** Rendered HTML preview. For Supabase templates: includes `{{ .Variable }}`
   *  placeholders that Supabase will substitute when sending. Copy the full
   *  HTML from the preview into the corresponding Supabase template editor. */
  preview?: () => string
  /** Short explanation of when/why this email fires. */
  trigger: string
}

const BRAND = {
  canvas: "#FBF5EE",
  ink: "#1E2A3A",
  muted: "#7A8596",
  primary: "#E98873",
  coralDeep: "#D85C48",
  navy: "#2E3E56",
  blueSoft: "#4A6A8A",
  blueTint: "#EAF1F8",
}

function shell(content: string, preheader?: string, recipient?: string): string {
  return `<!DOCTYPE html><html lang="da"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>LektieRo</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:${BRAND.ink};-webkit-font-smoothing:antialiased;">
${preheader ? `<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;box-shadow:0 8px 24px rgba(30,42,58,0.06);overflow:hidden;">
      <tr><td style="padding:32px 40px 16px;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:${BRAND.ink};">
        Lektie<span style="color:${BRAND.coralDeep};">Ro</span>
      </td></tr>
      <tr><td style="padding:16px 40px 32px;">${content}</td></tr>
      <tr><td style="padding:20px 40px;border-top:1px solid rgba(30,42,58,0.06);font-size:12px;color:${BRAND.muted};line-height:1.6;">
        ${recipient ? `Sendt til <strong style="color:${BRAND.ink};">${recipient}</strong>.<br>` : ""}
        LektieRo ApS · <a href="https://lektiero.dk" style="color:${BRAND.blueSoft};text-decoration:none;">lektiero.dk</a> · <a href="https://lektiero.dk/da/privacy" style="color:${BRAND.blueSoft};text-decoration:none;">Privatlivspolitik</a><br>
        Har du spørgsmål? Svar direkte på denne mail, eller skriv til <a href="mailto:support@lektiero.dk" style="color:${BRAND.blueSoft};text-decoration:none;">support@lektiero.dk</a>.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

function ctaButton(url: string, label: string): string {
  return `<p style="margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;">
      ${label}
    </a>
  </p>`
}

// ─── Supabase-managed templates (we author HTML, they substitute variables) ──

const confirmSignupHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.25;margin:0 0 16px;color:${BRAND.ink};">
      Bekræft din email
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:${BRAND.ink};">
      Tak for at du oprettede en LektieRo-konto. Bekræft din email for at komme i gang.
    </p>
    ${ctaButton("{{ .ConfirmationURL }}", "Bekræft min email")}
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:20px 0 0;">
      Linket udløber efter 24 timer. Har du ikke oprettet en konto hos os? Så kan du trygt ignorere denne mail.
    </p>`,
    "Ét klik og din LektieRo-konto er aktiv.",
    "{{ .Email }}"
  )

const inviteUserHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.25;margin:0 0 16px;color:${BRAND.ink};">
      Du er inviteret til LektieRo
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:${BRAND.ink};">
      En administrator har givet dig tidlig adgang. Accepter invitationen og vælg din egen adgangskode for at komme i gang.
    </p>
    ${ctaButton("{{ .ConfirmationURL }}", "Accepter invitation")}
    <p style="font-size:14px;color:${BRAND.ink};line-height:1.6;margin:28px 0 0;">
      LektieRo er en dansk AI-lektiehjælp til folkeskoleelever. Vi guider barnet trin for trin uden at give facit.
    </p>
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:16px 0 0;">
      Har du modtaget denne mail ved en fejl? Så kan du bare ignorere den.
    </p>`,
    "En forælder-konto venter på dig hos LektieRo.",
    "{{ .Email }}"
  )

const magicLinkHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.25;margin:0 0 16px;color:${BRAND.ink};">
      Log ind på LektieRo
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:${BRAND.ink};">
      Du bad om et engangslink til din konto. Tryk herunder for at logge ind.
    </p>
    ${ctaButton("{{ .ConfirmationURL }}", "Log mig ind")}
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:20px 0 0;">
      Linket virker i 1 time og kun én gang. Bad du ikke om et login? Ingen kan bruge det uden at have din indbakke, så du kan trygt ignorere mailen.
    </p>`,
    "Dit login-link til LektieRo.",
    "{{ .Email }}"
  )

const resetPasswordHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.25;margin:0 0 16px;color:${BRAND.ink};">
      Nulstil din adgangskode
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 20px;color:${BRAND.ink};">
      Du bad om at nulstille adgangskoden til din LektieRo-konto. Vælg en ny herunder.
    </p>
    ${ctaButton("{{ .ConfirmationURL }}", "Vælg ny adgangskode")}
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:20px 0 0;">
      Linket virker i 1 time. Bad du ikke om at nulstille? Så kan du ignorere mailen — din nuværende adgangskode forbliver aktiv.
    </p>`,
    "Vælg en ny adgangskode til din LektieRo-konto.",
    "{{ .Email }}"
  )

// ─── LektieRo-owned templates (sent via Resend) ─────────────────────────────

const welcomeHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 16px;color:${BRAND.ink};">
      Velkommen til LektieRo!
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:${BRAND.ink};">
      Tak for at du er med. Du kan nu logge ind og tilføje dit barns profil, så vejledningen kan tilpasses.
    </p>
    ${ctaButton("https://lektiero.dk/da/parent/dashboard", "Gå til dashboard")}
    <p style="font-size:14px;color:${BRAND.muted};line-height:1.6;margin:0;">
      Spørgsmål? Skriv til <a href="mailto:support@lektiero.dk" style="color:${BRAND.blueSoft};">support@lektiero.dk</a>.
    </p>`,
    "Velkommen. Her er hvordan du kommer i gang."
  )

const waitlistHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 16px;color:${BRAND.ink};">
      Tak! Du er på listen.
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:${BRAND.ink};">
      Vi kontakter dig så snart der er en plads til jeres familie. Første bølge forældre får 7 dages gratis prøveperiode.
    </p>
    <p style="font-size:14px;color:${BRAND.muted};margin:24px 0 0;line-height:1.6;">
      Imens: læs mere om hvordan vi guider børn gennem lektierne uden at give facit på
      <a href="https://lektiero.dk/da/faq" style="color:${BRAND.blueSoft};">vores FAQ</a>.
    </p>`,
    "Du er nu skrevet op til LektieRo's tidlige adgang."
  )

// ─── Registry ────────────────────────────────────────────────────────────────

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "supabase-confirm-signup",
    name: "Bekræft email (signup)",
    description: "Sendes når en bruger opretter konto via email + adgangskode. Brugeren skal klikke linket for at aktivere kontoen.",
    subject: "Bekræft din email for LektieRo",
    owner: "supabase",
    status: "live",
    editUrl: "https://supabase.com/dashboard/project/_/auth/templates",
    preview: confirmSignupHtml,
    trigger: "Automatisk ved POST til /auth/v1/signup",
  },
  {
    id: "supabase-invite",
    name: "Invitation til ny forælder",
    description: "Sendes fra admin-panelet når vi inviterer en ny forælder. Indeholder et link hvor modtageren vælger sin egen adgangskode.",
    subject: "Du er inviteret til LektieRo",
    owner: "supabase",
    status: "live",
    editUrl: "https://supabase.com/dashboard/project/_/auth/templates",
    preview: inviteUserHtml,
    trigger: "Admin klikker 'Inviter' på /da/admin",
  },
  {
    id: "supabase-magic-link",
    name: "Magic link login",
    description: "Passwordløs login via engangslink. Ikke aktivt i LektieRo i dag, men aktiveret som fallback.",
    subject: "Log ind på LektieRo",
    owner: "supabase",
    status: "planned",
    editUrl: "https://supabase.com/dashboard/project/_/auth/templates",
    preview: magicLinkHtml,
    trigger: "Bruger beder om magic link (ikke eksponeret i UI endnu)",
  },
  {
    id: "supabase-reset-password",
    name: "Nulstil adgangskode",
    description: "Sendes når brugeren beder om at nulstille sin adgangskode. Linket åbner et formularvindue hvor de vælger en ny.",
    subject: "Nulstil din LektieRo-adgangskode",
    owner: "supabase",
    status: "live",
    editUrl: "https://supabase.com/dashboard/project/_/auth/templates",
    preview: resetPasswordHtml,
    trigger: "Bruger klikker 'Glemt adgangskode' (ikke eksponeret i UI endnu)",
  },
  {
    id: "lektiero-welcome",
    name: "Velkomstmail",
    description: "Hilser nye forældre velkomne når deres email er bekræftet og de har oprettet første barn.",
    subject: "Velkommen til LektieRo",
    owner: "lektiero",
    status: "planned",
    preview: welcomeHtml,
    trigger: "Når parent har bekræftet email + oprettet første barn via onboarding",
  },
  {
    id: "lektiero-waitlist",
    name: "Venteliste-bekræftelse",
    description: "Sendes når en besøgende har skrevet sig på ventelisten.",
    subject: "Du er skrevet op til LektieRo",
    owner: "lektiero",
    status: "planned",
    preview: waitlistHtml,
    trigger: "POST /api/waitlist (efter succesfuld insert)",
  },
]

export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id)
}
