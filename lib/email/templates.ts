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

function shell(content: string, preheader?: string): string {
  return `<!DOCTYPE html><html lang="da"><head><meta charset="utf-8"><title>LektieRo</title></head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:${BRAND.ink};">
${preheader ? `<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;box-shadow:0 8px 24px rgba(30,42,58,0.06);overflow:hidden;">
      <tr><td style="padding:32px 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:40px;vertical-align:middle;">
            <div style="width:40px;height:40px;border-radius:20px;background:rgba(216,92,72,0.12);display:inline-block;text-align:center;line-height:40px;color:${BRAND.coralDeep};font-size:20px;">♥</div>
          </td>
          <td style="padding-left:12px;font-size:20px;font-weight:700;letter-spacing:-0.01em;color:${BRAND.ink};vertical-align:middle;">
            Lektie<span style="color:${BRAND.coralDeep};">Ro</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:16px 40px 32px;">${content}</td></tr>
      <tr><td style="padding:20px 40px;border-top:1px solid rgba(30,42,58,0.06);font-size:12px;color:${BRAND.muted};line-height:1.6;">
        Du modtager denne mail fordi du har en LektieRo-konto eller er tilmeldt vores venteliste.<br>
        <a href="https://lektiero.dk" style="color:${BRAND.blueSoft};">lektiero.dk</a>
        &nbsp;·&nbsp;
        <a href="https://lektiero.dk/da/privacy" style="color:${BRAND.blueSoft};">Privatlivspolitik</a>
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
    `<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 12px;color:${BRAND.ink};">
      Bekræft din email
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;color:${BRAND.ink};">
      Hej,
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;color:${BRAND.ink};">
      Tak for at du har oprettet en konto på LektieRo. Tryk på knappen herunder for at bekræfte at det er din email-adresse og aktivere din konto.
    </p>
    ${ctaButton("{{ .ConfirmationURL }}", "Bekræft min email")}
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:24px 0 0;">
      Hvis knappen ikke virker, kan du kopiere dette link ind i din browser:<br>
      <span style="word-break:break-all;color:${BRAND.blueSoft};">{{ .ConfirmationURL }}</span>
    </p>
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:16px 0 0;">
      Har du ikke oprettet en konto hos os? Så kan du trygt ignorere denne mail.
    </p>`,
    "Et klik og din LektieRo-konto er aktiv."
  )

const inviteUserHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 12px;color:${BRAND.ink};">
      Du er inviteret til LektieRo
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;color:${BRAND.ink};">
      Hej,
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;color:${BRAND.ink};">
      En administrator har inviteret dig til at få tidlig adgang til LektieRo. Tryk på knappen herunder for at acceptere invitationen og vælge en adgangskode.
    </p>
    ${ctaButton("{{ .ConfirmationURL }}", "Accepter invitation")}
    <div style="background:${BRAND.blueTint};border-radius:12px;padding:16px 20px;margin:24px 0;">
      <p style="font-size:14px;color:${BRAND.ink};margin:0 0 4px;font-weight:600;">Hvad er LektieRo?</p>
      <p style="font-size:14px;color:${BRAND.ink};margin:0;line-height:1.6;">
        AI-lektiehjælp til danske folkeskoleelever. Vi guider barnet trin for trin uden at give facit.
      </p>
    </div>
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:24px 0 0;">
      Hvis knappen ikke virker, kan du kopiere dette link ind i din browser:<br>
      <span style="word-break:break-all;color:${BRAND.blueSoft};">{{ .ConfirmationURL }}</span>
    </p>`,
    "En forælder-konto venter på dig hos LektieRo."
  )

const magicLinkHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 12px;color:${BRAND.ink};">
      Log ind på LektieRo
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;color:${BRAND.ink};">
      Hej,
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;color:${BRAND.ink};">
      Du har bedt om et login-link. Tryk herunder for at logge ind på din konto.
    </p>
    ${ctaButton("{{ .ConfirmationURL }}", "Log mig ind")}
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:24px 0 0;">
      Linket udløber efter 1 time og kan kun bruges én gang.
    </p>
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:16px 0 0;">
      Har du ikke bedt om at logge ind? Så kan du trygt ignorere denne mail — ingen får adgang uden linket herover.
    </p>`,
    "Dit login-link til LektieRo."
  )

const resetPasswordHtml = () =>
  shell(
    `<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:0 0 12px;color:${BRAND.ink};">
      Nulstil din adgangskode
    </h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;color:${BRAND.ink};">
      Hej,
    </p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;color:${BRAND.ink};">
      Du har bedt om at nulstille adgangskoden til din LektieRo-konto. Tryk herunder for at vælge en ny.
    </p>
    ${ctaButton("{{ .ConfirmationURL }}", "Vælg ny adgangskode")}
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:24px 0 0;">
      Linket udløber efter 1 time. Hvis du ikke bruger det, forbliver din nuværende adgangskode aktiv.
    </p>
    <p style="font-size:13px;color:${BRAND.muted};line-height:1.6;margin:16px 0 0;">
      Har du ikke selv bedt om at nulstille? Så kan du trygt ignorere denne mail.
    </p>`,
    "Vælg en ny adgangskode til din LektieRo-konto."
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
