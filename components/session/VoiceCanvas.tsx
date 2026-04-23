"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Companion } from "@/components/mascot/Companion"
import { useCompanion } from "@/components/mascot/CompanionContext"
import { DEFAULT_COMPANION, type CompanionMood, type CompanionType } from "@/components/mascot/types"
import { stripForTts } from "@/lib/voice/tts-text"
import { renderBlock, tokenise } from "./blocks/parse"
import { K } from "./design-tokens"
import { StepChecklist } from "./StepChecklist"
import type { Task, Turn } from "./types"

// Voice mode ≠ chat. Design handoff ("LektieRo Voice Mode") frames this as a
// phone call with Dani: hero orb with pulsing rings, current-utterance caption
// that types itself out, dimmed-history transcript below, call-style dock at
// the bottom. Inline visuals ride under the relevant Dani turn. Completion /
// limit affordances live INSIDE Dani's latest bubble ("selections in the
// talking area, not bottom buttons"). Palette stays on v3 tokens from
// design-tokens.ts — the harmonised palette is the source of truth.

type Phase = "idle" | "thinking" | "speaking" | "listening" | "processing"

export function VoiceCanvas({
  task,
  turns,
  streaming,
  speaking,
  recording,
  transcribing,
  atLimit,
  assistantTurns,
  completed,
  voiceError,
  onMicPress,
  onComplete,
  onSubmitAnswer,
  onDismissError,
  onRequestNewPhoto,
  micLevel = 0,
  stepsDone,
  stepsCurrent,
}: {
  task: Task
  turns: Turn[]
  streaming: boolean
  speaking: boolean
  recording: boolean
  transcribing: boolean
  atLimit: boolean
  assistantTurns: number
  completed: boolean
  voiceError: string | null
  onMicPress: () => void
  onComplete: () => void
  onSubmitAnswer: (value: string) => void
  onDismissError: () => void
  /** Fires when the AI emits [needphoto] and the kid taps the retake button. */
  onRequestNewPhoto?: () => void
  /** Live RMS from the VAD during recording — drives the dock level meter.
   *  0..~0.1 typical range. 0 when idle. */
  micLevel?: number
  /** Step labels the AI has marked as solved via [progress done="..."].
   *  Drives the StepChecklist at the top — the kid sees checkmarks land. */
  stepsDone?: Set<string>
  /** Current step label (from [progress current="..."]), highlighted. */
  stepsCurrent?: string | null
}) {
  const { type } = useCompanion()
  const companionType = type ?? DEFAULT_COMPANION
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Speaking takes priority over streaming: with chunked TTS, Dani starts
  // speaking sentence 1 while the LLM is still writing sentence 2, so both
  // flags are true at once. The caption must reflect what the kid HEARS.
  const phase: Phase = speaking
    ? "speaking"
    : streaming
      ? "thinking"
      : recording
        ? "listening"
        : transcribing
          ? "processing"
          : "idle"

  const lastTurn = turns[turns.length - 1] ?? null
  const heroText = useMemo(
    () => buildHeroText(phase, lastTurn),
    [phase, lastTurn]
  )

  // Auto-scroll transcript as turns land.
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [turns.length, phase])

  const lastAssistantIdx = findLastAssistantIdx(turns)
  const showCompletionChip = !completed && (atLimit || assistantTurns >= 1)

  return (
    <div
      style={{
        position: "relative",
        fontFamily: K.sans,
        color: K.ink,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: K.bg,
        borderRadius: 24,
        boxShadow: K.shadowCard,
        border: "1px solid rgba(31,27,51,0.04)",
        overflow: "hidden",
      }}
    >
      <AmbientGlow />
      <TopBar phase={phase} task={task} onClose={onComplete} />
      {task.steps && task.steps.length > 0 && (
        <div style={{ position: "relative", zIndex: 2, padding: "0 16px" }}>
          <StepChecklist
            steps={task.steps}
            done={stepsDone ?? new Set()}
            current={stepsCurrent ?? null}
          />
        </div>
      )}
      {voiceError && (
        <ErrorBanner message={voiceError} onDismiss={onDismissError} onRetry={onMicPress} />
      )}
      <Hero
        phase={phase}
        companionType={companionType}
        heroText={heroText}
        onMicPress={onMicPress}
        canPress={!atLimit && !completed}
      />

      <div
        ref={transcriptRef}
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: "auto",
          padding: "4px 18px 150px",
          maskImage:
            "linear-gradient(to bottom, transparent 0, #000 20px, #000 calc(100% - 80px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, #000 20px, #000 calc(100% - 80px), transparent 100%)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: K.ink2,
            letterSpacing: 1,
            textTransform: "uppercase",
            textAlign: "center",
            padding: "4px 0 12px",
          }}
        >
          Samtale
        </div>

        {turns.map((t, i) => {
          const isLatest = i === turns.length - 1
          const dim = !isLatest && i < lastAssistantIdx
          if (t.role === "assistant") {
            const isLastAssistant = i === lastAssistantIdx
            return (
              <DaniTurn
                key={i}
                text={t.content}
                dim={dim}
                isCurrent={isLatest}
                onSubmitAnswer={onSubmitAnswer}
                onRequestNewPhoto={onRequestNewPhoto}
                onEndTask={onComplete}
                inlineChip={
                  isLastAssistant && showCompletionChip ? (
                    <InlineCompletionChip atLimit={atLimit} onClick={onComplete} />
                  ) : null
                }
              />
            )
          }
          return <KidTurn key={i} text={t.content} dim={dim} />
        })}
      </div>

      <Dock phase={phase} onMicPress={onMicPress} onEnd={onComplete} micLevel={micLevel} />
    </div>
  )
}

// ─── Ambient background ────────────────────────────────────────────────

function AmbientGlow() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          `radial-gradient(ellipse at 50% 0%, ${K.mintSoft}CC 0%, transparent 55%),` +
          `radial-gradient(ellipse at 20% 100%, ${K.claySoft}55 0%, transparent 50%)`,
      }}
    />
  )
}

// ─── Top bar: live state pill + task title + timer + close ─────────────

function TopBar({
  phase,
  task,
  onClose,
}: {
  phase: Phase
  task: Task
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        padding: "14px 16px 10px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: "1px solid rgba(31,27,51,0.05)",
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(10px)",
      }}
    >
      <StatePill phase={phase} />
      <TaskSubtitle text={task.text} />
      <CallTimer />
      <button
        onClick={onClose}
        aria-label="Afslut samtale"
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          border: "none",
          background: "rgba(255,255,255,0.85)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(31,27,51,0.08)",
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 2l8 8M10 2l-8 8" stroke={K.ink} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function StatePill({ phase }: { phase: Phase }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px 6px 10px",
        borderRadius: 999,
        background: "#fff",
        border: "1px solid rgba(31,27,51,0.06)",
        fontSize: 12,
        fontWeight: 700,
        color: K.ink,
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dotColor(phase),
          animation: "voiceDotPulse 1.4s ease-in-out infinite",
        }}
      />
      Dani {phaseLabel(phase)}
    </div>
  )
}

function TaskSubtitle({ text }: { text: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        fontFamily: K.serif,
        fontSize: 13,
        fontWeight: 500,
        color: K.ink2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={text}
    >
      {text}
    </div>
  )
}

function CallTimer() {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setSec(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  const mm = String(Math.floor(sec / 60)).padStart(2, "0")
  const ss = String(sec % 60).padStart(2, "0")
  return (
    <div
      style={{
        fontFamily: K.serif,
        fontSize: 13,
        fontWeight: 600,
        color: K.ink2,
        fontVariantNumeric: "tabular-nums",
        flexShrink: 0,
      }}
    >
      {mm}:{ss}
    </div>
  )
}

// ─── Hero: orb + typing caption ────────────────────────────────────────

function Hero({
  phase,
  companionType,
  heroText,
  onMicPress,
  canPress,
}: {
  phase: Phase
  companionType: CompanionType
  heroText: { text: string; who: "dani" | "kid" | "coach" }
  onMicPress: () => void
  canPress: boolean
}) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        padding: "10px 24px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <OrbStage
        phase={phase}
        companionType={companionType}
        onMicPress={onMicPress}
        canPress={canPress}
      />
      <HeroCaption heroText={heroText} />
      <style>{`
        @keyframes voiceDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.72); }
        }
        @keyframes voiceOrbPulse {
          0%   { transform: scale(0.85); opacity: 0; }
          30%  { opacity: 0.42; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes voiceBar {
          0%   { height: 6px; }
          100% { height: 22px; }
        }
        @keyframes voiceVisualIn {
          0%   { opacity: 0; transform: translateY(8px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes voiceSlideIn {
          0% { opacity: 0; transform: translateX(-12px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes voiceSlideInRight {
          0% { opacity: 0; transform: translateX(12px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

function OrbStage({
  phase,
  companionType,
  onMicPress,
  canPress,
}: {
  phase: Phase
  companionType: CompanionType
  onMicPress: () => void
  canPress: boolean
}) {
  const ring = orbRingColor(phase)
  const bobbing = phase === "speaking" || phase === "idle"
  const mood = phaseMood(phase)
  const pressable =
    canPress && (phase === "idle" || phase === "listening")
  const ariaLabel =
    phase === "listening"
      ? "Stop optagelse"
      : phase === "idle"
        ? "Tryk og tal med Dani"
        : "Dani svarer lige om lidt"
  return (
    <button
      type="button"
      onClick={pressable ? onMicPress : undefined}
      aria-label={ariaLabel}
      disabled={!pressable}
      style={{
        all: "unset",
        position: "relative",
        width: 168,
        height: 168,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        cursor: pressable ? "pointer" : "default",
      }}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${ring}`,
            opacity: 0.26 - i * 0.07,
            animation: `voiceOrbPulse 2.4s ease-in-out ${i * 0.3}s infinite`,
          }}
        />
      ))}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 22,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 30%, ${ring}33 0%, transparent 70%)`,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>
        <Companion type={companionType} mood={mood} size={112} bobbing={bobbing} />
      </span>
      {phase === "idle" && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            width: 36,
            height: 36,
            borderRadius: 999,
            background: K.mint,
            color: "#1F2D1A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 6px 14px -6px ${K.mint}`,
            fontSize: 18,
          }}
        >
          🎙
        </span>
      )}
    </button>
  )
}

function HeroCaption({
  heroText,
}: {
  heroText: { text: string; who: "dani" | "kid" | "coach" }
}) {
  return (
    <div
      style={{
        minHeight: 48,
        maxWidth: 340,
        textAlign: "center",
        fontFamily: K.serif,
        fontSize: 18,
        lineHeight: 1.35,
        color: heroText.who === "dani" ? K.ink : K.ink2,
        fontWeight: heroText.who === "dani" ? 500 : 400,
        fontStyle: heroText.who === "dani" ? "normal" : "italic",
      }}
      aria-live="polite"
    >
      {heroText.who === "dani" ? (
        <TypingCaption key={heroText.text} text={stripForTts(heroText.text)} />
      ) : heroText.who === "kid" ? (
        <>
          <span style={{ color: K.clay, fontWeight: 600, fontStyle: "normal" }}>
            Du:{" "}
          </span>
          &ldquo;{heroText.text}&rdquo;
        </>
      ) : (
        <span style={{ opacity: 0.85 }}>{heroText.text}</span>
      )}
    </div>
  )
}

function TypingCaption({ text }: { text: string }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    setShown(0)
    const id = window.setInterval(() => {
      setShown(s => {
        if (s >= text.length) {
          window.clearInterval(id)
          return s
        }
        return s + 1
      })
    }, 22)
    return () => window.clearInterval(id)
  }, [text])
  return (
    <span>
      {text.slice(0, shown)}
      <span style={{ opacity: 0.35 }}>{text.slice(shown)}</span>
    </span>
  )
}

// ─── Transcript turns ──────────────────────────────────────────────────

function DaniTurn({
  text,
  dim,
  isCurrent,
  onSubmitAnswer,
  onRequestNewPhoto,
  onEndTask,
  inlineChip,
}: {
  text: string
  dim: boolean
  isCurrent: boolean
  onSubmitAnswer: (value: string) => void
  onRequestNewPhoto?: () => void
  onEndTask?: () => void
  inlineChip: React.ReactNode | null
}) {
  const blocks = useMemo(
    () =>
      tokenise(text)
        .filter(tok => tok.kind === "block")
        .map((tok, i) =>
          tok.kind === "block"
            ? renderBlock(tok.name, tok.attrs, `b${i}`, {
                onAnswer: onSubmitAnswer,
                onRequestNewPhoto,
                onEndTask,
              })
            : null
        )
        .filter(Boolean),
    [text, onSubmitAnswer, onRequestNewPhoto, onEndTask]
  )
  const spokenText = stripForTts(text)
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 14,
        opacity: dim ? 0.5 : 1,
        transition: "opacity 0.3s",
        animation: "voiceSlideIn 0.35s",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: K.mintSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 800,
          color: K.mintDeep,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        D
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: "4px 16px 16px 16px",
            padding: "10px 13px",
            fontSize: 13.5,
            color: K.ink,
            lineHeight: 1.45,
            border: "1px solid rgba(31,27,51,0.05)",
            boxShadow: isCurrent ? `0 6px 18px -10px ${K.mint}70` : "none",
          }}
        >
          {spokenText}
          {inlineChip && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-start" }}>
              {inlineChip}
            </div>
          )}
        </div>
        {blocks.length > 0 && <InlineVisualCard>{blocks}</InlineVisualCard>}
      </div>
    </div>
  )
}

function KidTurn({ text, dim }: { text: string; dim: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 14,
        opacity: dim ? 0.45 : 1,
        transition: "opacity 0.3s",
        animation: "voiceSlideInRight 0.35s",
      }}
    >
      <div
        style={{
          background: K.claySoft,
          borderRadius: "16px 4px 16px 16px",
          padding: "8px 13px",
          fontSize: 13,
          color: K.clay,
          lineHeight: 1.4,
          fontStyle: "italic",
          maxWidth: "80%",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          style={{ flexShrink: 0, opacity: 0.65 }}
        >
          <path
            d="M6 1 v6 M4 5 l2 2 l2 -2 M3 10 h6"
            stroke={K.clay}
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        &ldquo;{text}&rdquo;
      </div>
    </div>
  )
}

function InlineVisualCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 10,
        background: "#fff",
        borderRadius: 16,
        padding: 14,
        border: "1px solid rgba(31,27,51,0.06)",
        boxShadow: "0 10px 24px -14px rgba(31,45,26,0.15)",
        animation: "voiceVisualIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: K.ink2,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="5" fill="none" stroke={K.mintDeep} strokeWidth="1.5" />
          <path d="M6 3v4M6 8.5v0.5" stroke={K.mintDeep} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Dani viser dig
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        {children}
      </div>
    </div>
  )
}

function InlineCompletionChip({
  atLimit,
  onClick,
}: {
  atLimit: boolean
  onClick: () => void
}) {
  const label = atLimit ? "Afslut samtale" : "Opgave løst ✓"
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: atLimit ? K.clay : K.mint,
        color: atLimit ? "#fff" : K.ink,
        borderRadius: 999,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        boxShadow: `0 4px 10px -6px ${atLimit ? K.clay : K.mint}80`,
      }}
    >
      {label}
    </button>
  )
}

// ─── Bottom dock: mute + waveform + end call ───────────────────────────

function Dock({
  phase,
  onMicPress,
  onEnd,
  micLevel,
}: {
  phase: Phase
  onMicPress: () => void
  onEnd: () => void
  micLevel: number
}) {
  const [muted, setMuted] = useState(false)
  const active = phase === "listening" || phase === "speaking"
  const color = phase === "listening" ? K.clay : K.mint
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "14px 18px 22px",
        background: `linear-gradient(to top, ${K.bg} 45%, rgba(245,237,222,0) 100%)`,
        zIndex: 3,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 999,
          padding: "10px 12px",
          boxShadow: "0 10px 28px -14px rgba(31,45,26,0.22), 0 0 0 1px rgba(31,27,51,0.05)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setMuted(m => !m)}
          aria-label={muted ? "Slå lyd til" : "Slå lyd fra"}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            flexShrink: 0,
            border: "none",
            background: muted ? K.clay : K.bg2,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                d="M9 2a2.5 2.5 0 00-2.5 2.5v4.2l5 5V4.5A2.5 2.5 0 009 2zM4 8.5a5 5 0 009.3 2.6l1.1 1.1A6.5 6.5 0 013 10V8.5h1zM2 2l14 14"
                stroke="#fff"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <rect x="6.5" y="2" width="5" height="10" rx="2.5" fill={K.ink} />
              <path
                d="M3 8.5a6 6 0 0012 0M9 14.5V17"
                stroke={K.ink}
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={onMicPress}
          aria-label={phase === "listening" ? "Stop optagelse" : "Talen er automatisk"}
          style={{
            flex: 1,
            height: 32,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            padding: 0,
          }}
        >
          {Array.from({ length: 22 }).map((_, i) => {
            // Real mic-level meter when recording, cosmetic pulse when speaking,
            // flat line when idle. Maps RMS 0..0.08 → bar height 4..24. Each
            // bar has a slightly different threshold so they light up sequentially
            // as the kid's voice gets louder — gives visible feedback that audio
            // is actually being captured.
            const isListening = phase === "listening"
            const isSpeakingPhase = phase === "speaking"
            const barThreshold = (i / 22) * 0.05
            const lit = isListening && micLevel >= barThreshold
            const height = isListening
              ? Math.max(4, Math.min(24, micLevel * 260 + 4))
              : isSpeakingPhase
                ? undefined
                : 4
            return (
              <span
                key={i}
                aria-hidden
                style={{
                  flex: 1,
                  borderRadius: 999,
                  background: isListening
                    ? (lit ? K.clay : K.ink3)
                    : isSpeakingPhase
                      ? color
                      : K.ink3,
                  opacity: isListening
                    ? (lit ? 1 : 0.2)
                    : isSpeakingPhase
                      ? 1
                      : 0.3,
                  animation: isSpeakingPhase
                    ? `voiceBar ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.04}s infinite alternate`
                    : "none",
                  transition: isListening ? "height 60ms linear, opacity 60ms linear" : undefined,
                  height,
                  minHeight: 4,
                }}
              />
            )
          })}
        </button>

        <button
          type="button"
          onClick={onEnd}
          aria-label="Afslut samtale"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            flexShrink: 0,
            border: "none",
            background: "#D14848",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px -4px rgba(209,72,72,0.6)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div
        style={{
          marginTop: 8,
          textAlign: "center",
          fontSize: 11,
          color: K.ink2,
          fontWeight: 500,
        }}
      >
        {phase === "listening"
          ? "Jeg stopper selv, når du er færdig"
          : phase === "speaking"
            ? "Dani taler — vent et øjeblik"
            : phase === "thinking"
              ? "Dani tænker …"
              : phase === "processing"
                ? "Skriver det du sagde …"
                : "Dani åbner mikken lige om lidt"}
      </div>
    </div>
  )
}

// ─── Error banner ──────────────────────────────────────────────────────

function ErrorBanner({
  message,
  onDismiss,
  onRetry,
}: {
  message: string
  onDismiss: () => void
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      style={{
        position: "relative",
        zIndex: 3,
        margin: "10px 16px 2px",
        padding: "10px 14px",
        borderRadius: 14,
        background: K.claySoft,
        border: `1.5px solid ${K.clay}`,
        color: K.clay,
        fontSize: 13,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: `0 6px 18px -8px ${K.clay}60`,
        animation: "voiceErrorIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <style>{`
        @keyframes voiceErrorIn {
          0%   { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          background: K.clay,
          color: "#fff",
          borderRadius: 999,
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        !
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        style={{
          border: "none",
          background: K.clay,
          color: "#fff",
          borderRadius: 999,
          padding: "4px 10px",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Tal nu
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Luk"
        style={{
          border: "none",
          background: "transparent",
          color: K.clay,
          cursor: "pointer",
          padding: 2,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────

function buildHeroText(
  phase: Phase,
  lastTurn: Turn | null
): { text: string; who: "dani" | "kid" | "coach" } {
  if (lastTurn?.role === "assistant" && (phase === "speaking" || phase === "idle")) {
    return { text: lastTurn.content, who: "dani" }
  }
  if (lastTurn?.role === "user" && (phase === "processing" || phase === "thinking")) {
    return { text: lastTurn.content, who: "kid" }
  }
  // Chunked TTS can start speaking before the turn is committed to state, so
  // phase=speaking with a kid lastTurn is legit — show a neutral coach line
  // rather than the "Vi starter om et øjeblik" fallback.
  if (phase === "speaking") return { text: "Dani taler …", who: "coach" }
  if (phase === "thinking") return { text: "Dani tænker over dit svar …", who: "coach" }
  if (phase === "listening") return { text: "Sig dit svar højt", who: "coach" }
  if (phase === "processing") return { text: "Skriver det du lige sagde …", who: "coach" }
  if (lastTurn?.role === "assistant") return { text: lastTurn.content, who: "dani" }
  return { text: "Vi starter om et øjeblik …", who: "coach" }
}

function findLastAssistantIdx(turns: Turn[]): number {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "assistant") return i
  }
  return -1
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "speaking":   return "taler"
    case "listening":  return "lytter"
    case "thinking":   return "tænker"
    case "processing": return "skriver"
    default:           return "klar"
  }
}

function dotColor(phase: Phase): string {
  switch (phase) {
    case "listening":  return K.clay
    case "speaking":   return K.mint
    case "thinking":   return K.mintDeep
    case "processing": return K.ink2
    default:           return K.mintEdge
  }
}

function orbRingColor(phase: Phase): string {
  switch (phase) {
    case "listening": return K.clay
    case "speaking":  return K.mint
    case "thinking":  return K.mintEdge
    default:          return K.mintEdge
  }
}

function phaseMood(phase: Phase): CompanionMood {
  switch (phase) {
    case "listening":  return "curious"
    case "speaking":   return "happy"
    case "thinking":   return "thinking"
    case "processing": return "thinking"
    default:           return "happy"
  }
}
