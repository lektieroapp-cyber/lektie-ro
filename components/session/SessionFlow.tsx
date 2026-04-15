"use client"

import { useRef, useState } from "react"
import { ScanPanel } from "./ScanPanel"
import { ThinkingPanel } from "./ThinkingPanel"
import { TaskPicker } from "./TaskPicker"
import { ModeSelector } from "./ModeSelector"
import { HintChat } from "./HintChat"
import type { HintMode, SolveResponse, Task, Turn } from "./types"

type Stage = "idle" | "uploading" | "thinking" | "pick" | "mode" | "hint" | "done"

const MAX_BYTES = 10 * 1024 * 1024

const EXT_FROM_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
}

export function SessionFlow() {
  const [stage, setStage] = useState<Stage>("idle")
  const [solve, setSolve] = useState<SolveResponse | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [mode, setMode] = useState<HintMode | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File): Promise<string> {
    const ext = EXT_FROM_TYPE[file.type] || file.name.split(".").pop()?.toLowerCase() || "jpg"
    const urlRes = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, size: file.size, ext }),
    })
    if (!urlRes.ok) {
      const j = await urlRes.json().catch(() => ({}))
      throw new Error(`upload-url ${urlRes.status} ${j.error ?? ""}`)
    }
    const { uploadUrl, path } = (await urlRes.json()) as { uploadUrl: string; path: string }

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    })
    if (!putRes.ok) throw new Error(`storage PUT ${putRes.status}`)
    return path
  }

  async function onFile(file: File) {
    setError(null)
    if (file.size > MAX_BYTES) {
      setError("Billedet er for stort. Maks 10 MB.")
      return
    }
    if (!EXT_FROM_TYPE[file.type] && !file.type.startsWith("image/")) {
      setError("Filen ser ikke ud til at være et billede.")
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    setStage("uploading")

    try {
      const path = await uploadFile(file)
      setImagePath(path)
      setStage("thinking")

      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path, imageName: file.name }),
      })
      if (!res.ok) throw new Error("solve failed")
      const data = (await res.json()) as SolveResponse
      setSolve(data)
      setStage("pick")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ukendt fejl"
      setError(`Kunne ikke uploade billedet (${msg}). Prøv igen.`)
      setStage("idle")
    }
  }

  function pickTask(t: Task) {
    setTask(t)
    setTurns([])
    setStage("mode")
  }

  function pickMode(m: HintMode) {
    setMode(m)
    setStage("hint")
  }

  function reset() {
    setStage("idle")
    setSolve(null)
    setTask(null)
    setMode(null)
    setTurns([])
    setImagePath(null)
    setError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <>
      {stage === "idle" && (
        <ScanPanel
          onSelect={() => fileRef.current?.click()}
          onFile={onFile}
          error={error}
        />
      )}
      {(stage === "uploading" || stage === "thinking") && (
        <ThinkingPanel
          previewUrl={previewUrl}
          label={stage === "uploading" ? "Uploader billede …" : "Jeg kigger på opgaven …"}
          sub={
            stage === "uploading"
              ? "Vi sender dit billede sikkert til vores server i Sverige."
              : "Et øjeblik mens jeg finder ud af, hvad du arbejder med."
          }
        />
      )}
      {stage === "pick" && solve && (
        <TaskPicker
          solve={solve}
          onPick={pickTask}
          onCancel={reset}
          imagePath={imagePath}
        />
      )}
      {stage === "mode" && task && solve && (
        <ModeSelector
          task={task}
          solve={solve}
          onSelect={pickMode}
          onBack={() => setStage("pick")}
        />
      )}
      {(stage === "hint" || stage === "done") && task && solve && mode && (
        <HintChat
          task={task}
          solve={solve}
          mode={mode}
          turns={turns}
          setTurns={setTurns}
          onComplete={() => setStage("done")}
          onReset={reset}
          onSwitchToHint={() => { setMode("hint"); setTurns([]) }}
          completed={stage === "done"}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
    </>
  )
}
