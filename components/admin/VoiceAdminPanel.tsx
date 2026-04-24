"use client"

import { useState, useTransition } from "react"
import { Select } from "@/components/ui/Select"
import { VoicePricingMatrix } from "@/components/admin/VoicePricingMatrix"
import { VoiceTester } from "@/components/admin/VoiceTester"
import { AZURE_VOICES } from "@/lib/voice"
import type { VoiceMode, VoiceModeDiagnostics } from "@/lib/voice-mode"

// Azure-only admin surface. STT and TTS both routed through Azure AI Speech
// (Sweden Central) — one vendor, one DPA, full GDPR coverage. The provider
// abstraction in `lib/voice/` still exists so we can add ElevenLabs / Google
// back without a rewrite, but the UI doesn't surface them.

type Props = {
  initialMode: VoiceMode
  initialDiagnostics: VoiceModeDiagnostics
}

export function VoiceAdminPanel({ initialMode, initialDiagnostics }: Props) {
  const [mode, setMode] = useState<VoiceMode>(initialMode)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function setAzureVoice(next: string) {
    setMode(prev => ({ ...prev, azureVoice: next }))
    startTransition(async () => {
      try {
        const res = await fetch("/api/voice-mode", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ azureVoice: next }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body?.error ?? `HTTP ${res.status}`)
        } else {
          setError(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "unknown")
      }
    })
  }

  return (
    <>
      <section
        className="mt-6 rounded-card bg-white p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <h3 className="text-base font-semibold text-ink">Stemmevalg</h3>
        <p className="mt-1 text-sm text-muted">
          Azure AI Speech (Sweden Central) håndterer både tale-til-tekst og
          tekst-til-tale. Stemmevalget gemmes som cookie pr. browser i 30 dage.
        </p>

        <div className="mt-5 max-w-sm">
          <label className="text-xs font-medium uppercase tracking-wider text-muted">
            Dansk Neural TTS-stemme
          </label>
          <Select
            value={mode.azureVoice}
            onChange={setAzureVoice}
            options={AZURE_VOICES.map(v => ({ value: v.id, label: v.label }))}
          />
          <p className="mt-1 text-xs text-muted">
            Jeppe / Christel er native danske stemmer — udtaler IKKE engelske
            citater korrekt. HYBRID-valgene skifter til en engelsk stemme for
            tekst i citationstegn (to forskellige talere i samme sætning, men
            korrekt udtale begge sider).
          </p>
        </div>

        <AzureStatus diagnostics={initialDiagnostics} />

        {error && (
          <div className="mt-4 rounded-md bg-clay-soft p-3 text-sm text-clay">
            Kunne ikke gemme: {error}
          </div>
        )}
        {pending && <div className="mt-3 text-xs text-muted">Gemmer …</div>}
      </section>

      <VoicePricingMatrix />
      <VoiceTester mode={mode} configured={initialDiagnostics.azureConfigured} />
    </>
  )
}

function AzureStatus({ diagnostics }: { diagnostics: VoiceModeDiagnostics }) {
  const missing: string[] = []
  if (!diagnostics.azureConfigured) {
    if (!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY_PRESENT) {
      missing.push("AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION")
    }
  }
  return (
    <div className="mt-5 rounded-lg bg-canvas/60 p-3 text-xs text-muted">
      <div className="font-semibold text-ink/70">Azure-status</div>
      <ul className="mt-1.5 space-y-0.5">
        <li>
          AZURE_SPEECH_TTS_VOICE:{" "}
          <code>{diagnostics.envAzureVoice ?? "(unset)"}</code>
        </li>
        <li>
          NEXT_PUBLIC_VOICE_ENABLED:{" "}
          <code>{diagnostics.voiceEnabledFlag ? "true" : "(unset)"}</code>
        </li>
      </ul>
      {diagnostics.azureConfigured ? (
        <div className="mt-2 text-mint-deep">
          ✓ Azure Speech nøgler er sat. Klar til test.
        </div>
      ) : (
        <div className="mt-2 text-clay">
          Mangler i env: {missing.join(", ") || "AZURE_SPEECH_KEY + AZURE_SPEECH_REGION"}
        </div>
      )}
    </div>
  )
}
