"use client"

import { useRef, useState } from "react"
import { ScanPanel } from "./ScanPanel"
import { ThinkingPanel } from "./ThinkingPanel"
import { TaskPicker } from "./TaskPicker"
import { HintChat } from "./HintChat"
import type { SolveResponse, Task, Turn } from "./types"

type Stage = "idle" | "thinking" | "pick" | "hint" | "done"

export function SessionFlow() {
  const [stage, setStage] = useState<Stage>("idle")
  const [solve, setSolve] = useState<SolveResponse | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File) {
    setStage("thinking")
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageName: file.name }),
      })
      if (!res.ok) throw new Error("solve failed")
      const data = (await res.json()) as SolveResponse
      setSolve(data)
      setStage("pick")
    } catch {
      setStage("idle")
    }
  }

  function pickTask(t: Task) {
    setTask(t)
    setTurns([])
    setStage("hint")
  }

  function reset() {
    setStage("idle")
    setSolve(null)
    setTask(null)
    setTurns([])
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <>
      {stage === "idle" && (
        <ScanPanel
          onSelect={() => fileRef.current?.click()}
        />
      )}
      {stage === "thinking" && <ThinkingPanel />}
      {stage === "pick" && solve && (
        <TaskPicker solve={solve} onPick={pickTask} onCancel={reset} />
      )}
      {(stage === "hint" || stage === "done") && task && solve && (
        <HintChat
          task={task}
          solve={solve}
          turns={turns}
          setTurns={setTurns}
          onComplete={() => setStage("done")}
          onReset={reset}
          completed={stage === "done"}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
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
