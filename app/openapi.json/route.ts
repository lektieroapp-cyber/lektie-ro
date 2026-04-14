// Minimal OpenAPI 3.1 spec served at /openapi.json so crawlers and API
// discovery tools get something useful instead of a 404. Documents the
// public endpoints only — authenticated ones require a parent session and
// are out of scope here.

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "LektieRo API",
      version: "1.0.0",
      summary: "AI-baseret lektiehjælp til danske folkeskoleelever.",
      description:
        "LektieRo guider børn trin for trin gennem lektier uden nogensinde at give facit. Denne API er primært privat og benyttes af vores web-app. Kun endpoints uden autentifikation er dokumenteret her.",
      contact: {
        name: "LektieRo support",
        email: "support@lektiero.dk",
        url: `${base}/da/faq`,
      },
      license: {
        name: "Proprietary",
        url: `${base}/da/terms`,
      },
      termsOfService: `${base}/da/terms`,
    },
    servers: [
      { url: base, description: "Production" },
    ],
    externalDocs: {
      description: "Privatlivspolitik",
      url: `${base}/da/privacy`,
    },
    tags: [
      {
        name: "Waitlist",
        description: "Pre-launch email-capture til tidlig adgang.",
      },
    ],
    paths: {
      "/api/waitlist": {
        post: {
          tags: ["Waitlist"],
          summary: "Tilmeld til LektieRo ventelisten",
          description:
            "Tilføjer en email til ventelisten. Idempotent — den samme email returnerer { alreadyJoined: true } uden fejl.",
          operationId: "joinWaitlist",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: {
                      type: "string",
                      format: "email",
                      maxLength: 320,
                    },
                    locale: {
                      type: "string",
                      enum: ["da"],
                      default: "da",
                    },
                    source: {
                      type: "string",
                      maxLength: 80,
                      description: "Valgfri attribution-tag (fx 'newsletter', 'referral').",
                    },
                  },
                },
                examples: {
                  new: {
                    summary: "Ny tilmelding",
                    value: { email: "forelder@example.dk", locale: "da" },
                  },
                  duplicate: {
                    summary: "Allerede tilmeldt",
                    value: { email: "eksisterende@example.dk", locale: "da" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "OK — enten ny tilmelding eller allerede-eksisterende.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      alreadyJoined: { type: "boolean" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Ugyldig email eller sprog.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                        enum: ["invalid_input", "invalid_json"],
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Databasefejl.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string", const: "db_error" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        supabaseSession: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description:
            "Parent-authenticated endpoints (ikke dokumenteret her) kræver en gyldig Supabase-session-cookie.",
        },
      },
    },
  }

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
