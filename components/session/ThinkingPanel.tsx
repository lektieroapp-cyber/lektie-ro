"use client"

import { useEffect, useState } from "react"

const LABELS = [
  "Sender dit billede",
  "Kigger på opgaven",
  "Finder ud af hvad du arbejder med",
] as const

export function ThinkingPanel({
  previewUrl,
  uploading,
}: {
  previewUrl?: string | null
  uploading?: boolean
}) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (uploading) {
      setStep(0)
      return
    }
    setStep(1)
    const t = setTimeout(() => setStep(2), 2000)
    return () => clearTimeout(t)
  }, [uploading])

  return (
    <div
      className="rounded-card bg-white p-8 md:p-12 text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="mx-auto mb-6 max-h-40 w-auto rounded-xl object-contain transition-opacity duration-500 md:max-h-52"
          style={{ opacity: uploading ? 0.6 : 1 }}
        />
      )}

      <h2
        className="text-2xl font-bold text-ink md:text-3xl"
        style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
      >
        {LABELS[step]}
      </h2>

      <LoadingDots />
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="inline-block h-3 w-3 rounded-full bg-primary animate-[loading-dot_1.4s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 200}ms` }}
        />
      ))}
      <style>{`
        @keyframes loading-dot {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
