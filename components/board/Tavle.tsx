"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MathGlyph,
  BookGlyph,
  DictionaryGlyph,
} from "@/components/overview/SubjectSummaryCard"
import { EmptyTavle, TavleHeroIllustration } from "./EmptyTavle"
import type { TaskRow, TaskStatus, TaskSubject } from "@/lib/tasks"

type Mode = "kid" | "parent"

type Props = {
  locale: string
  mode: Mode
  /** All non-dismissed tasks (open + done). Kid mode: just this child. Parent mode: all kids. */
  tasks: TaskRow[]
  /** Map of childId → first name, used for parent-mode badges. */
  childNames?: Record<string, string>
  /** All of the parent's children (for the top-right kid dropdown). Empty
   *  in kid mode. The dropdown is hidden when length <= 1. */
  children?: { id: string; name: string }[]
  /** Currently-selected child id from `?childId=`. null = "Alle børn". */
  selectedChildId?: string | null
  /** Subject to auto-open on mount (deep-link from Forældre Ro). */
  initialSubject?: TaskSubject | null
  /** Path to the new-task or add-to-board page (depends on mode). */
  newTaskHref: string
  allowKidNewTask?: boolean
  messages: TavleMessages
}

type TavleMessages = {
  title: string
  subtitleKid: string
  subtitleParent: string
  subjects: Record<string, string>
  subjectOpgaverPlural: string
  subjectOpgaverSingular: string
  subjectOpgaverNone: string
  emptyKidTitle: string
  emptyKidBody: string
  emptyKidCta?: string
  emptyKidWaitTitle?: string
  emptyKidWaitBody?: string
  emptyParentTitle: string
  emptyParentBody: string
  emptyParentCta: string
  detailBack: string
  detailTotal: string
  detailTotalOne: string
  detailDoneOf: string
  tabAll: string
  tabPending: string
  tabInProgress: string
  tabDone: string
  statusPending: string
  statusInProgress: string
  statusDone: string
  addTaskCta: string
  emptyHeroTitle: string
  emptyHeroBody: string
  emptyHeroBodyKidWait: string
  subjectTaglineDansk: string
  subjectTaglineMatematik: string
  subjectTaglineEngelsk: string
  emptyTipTitle: string
  emptyTipBody: string
  emptyAddTaskTitle: string
  emptyAddTaskBody: string
  childPickerAll: string
  childPickerLabel: string
}

// Subject visual identity. Tints derived from screenshot mock; bar colors
// match the same family. Tysk only renders if it has tasks (no spec'd tint
// yet — reuses engelsk for now).
const SUBJECT_DEF: Record<TaskSubject, { tint: string; bar: string; glyph: React.ReactNode }> = {
  dansk:     { tint: "#E1EEDD", bar: "#5C9D6E", glyph: <BookGlyph /> },
  matematik: { tint: "#FBEFD7", bar: "#D6B850", glyph: <MathGlyph /> },
  engelsk:   { tint: "#E8DEF1", bar: "#7A5A9C", glyph: <DictionaryGlyph /> },
  tysk:      { tint: "#F4DBD1", bar: "#A05844", glyph: <DictionaryGlyph /> },
}

const SUBJECT_ORDER: TaskSubject[] = ["dansk", "matematik", "engelsk", "tysk"]

export function Tavle({
  locale,
  mode,
  tasks,
  childNames,
  children,
  selectedChildId,
  initialSubject,
  newTaskHref,
  allowKidNewTask = true,
  messages,
}: Props) {
  const router = useRouter()
  const [openSubject, setOpenSubject] = useState<TaskSubject | null>(initialSubject ?? null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const showChildPicker = mode === "parent" && (children?.length ?? 0) > 1
  function changeChildFilter(nextId: string | null) {
    const url = new URL(window.location.href)
    if (nextId) url.searchParams.set("childId", nextId)
    else url.searchParams.delete("childId")
    // Close the open subject view when switching kids — the previous kid's
    // detail panel doesn't apply.
    url.searchParams.delete("subject")
    setOpenSubject(null)
    startTransition(() => {
      router.replace(url.pathname + url.search, { scroll: false })
    })
  }

  const grouped: Record<TaskSubject, TaskRow[]> = {
    matematik: [], dansk: [], engelsk: [], tysk: [],
  }
  for (const t of tasks) grouped[t.subject].push(t)

  const showNewCta = mode === "parent" || allowKidNewTask
  const kidWaiting = mode === "kid" && !allowKidNewTask

  // Subjects to render — always show the canonical 3, plus tysk if it
  // actually has tasks. No "+ add subject" placeholder per current scope.
  const subjects = SUBJECT_ORDER.filter(
    s => s !== "tysk" || grouped.tysk.length > 0,
  )

  async function dismissTask(taskId: string) {
    setBusyId(taskId)
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      })
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  // Dedicated empty-state experience — hero illustration + wide subject
  // cards + tip strip. More inviting than the regular board with all-zero
  // counts.
  if (tasks.length === 0) {
    return (
      <div className="flex w-full flex-col gap-6 pb-12 md:pb-16">
        <Header
          title={messages.title}
          subtitle={mode === "kid" ? messages.subtitleKid : messages.subtitleParent}
          showChildPicker={showChildPicker}
          children={children ?? []}
          selectedChildId={selectedChildId ?? null}
          onChangeChild={changeChildFilter}
          allLabel={messages.childPickerAll}
          pickerLabel={messages.childPickerLabel}
        />
        <EmptyTavle
          newTaskHref={newTaskHref}
          showCta={showNewCta}
          messages={{
            emptyHeroTitle: messages.emptyHeroTitle,
            emptyHeroBody: messages.emptyHeroBody,
            emptyHeroBodyKidWait: messages.emptyHeroBodyKidWait,
            subjects: messages.subjects,
            subjectTaglineDansk: messages.subjectTaglineDansk,
            subjectTaglineMatematik: messages.subjectTaglineMatematik,
            subjectTaglineEngelsk: messages.subjectTaglineEngelsk,
            emptyTipTitle: messages.emptyTipTitle,
            emptyTipBody: messages.emptyTipBody,
            emptyAddTaskTitle: messages.emptyAddTaskTitle,
            emptyAddTaskBody: messages.emptyAddTaskBody,
          }}
        />
      </div>
    )
  }

  if (openSubject) {
    return (
      <SubjectDetail
        locale={locale}
        mode={mode}
        subject={openSubject}
        subjectLabel={messages.subjects[openSubject] ?? openSubject}
        tasks={grouped[openSubject]}
        childNames={childNames}
        showAddCta={showNewCta}
        // Carry the open subject through as ?subject= so the create page
        // pre-selects it. Same convention used by the empty-Tavle subject
        // cards.
        addCtaHref={`${newTaskHref}${newTaskHref.includes("?") ? "&" : "?"}subject=${openSubject}`}
        onBack={() => setOpenSubject(null)}
        onDismiss={dismissTask}
        busyId={busyId}
        messages={messages}
      />
    )
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-12 md:pb-16">
      <Header
        title={messages.title}
        subtitle={mode === "kid" ? messages.subtitleKid : messages.subtitleParent}
        showChildPicker={showChildPicker}
        children={children ?? []}
        selectedChildId={selectedChildId ?? null}
        onChangeChild={changeChildFilter}
        allLabel={messages.childPickerAll}
        pickerLabel={messages.childPickerLabel}
      />

      {/* Subject grid + hero illustration in a single white card —
          matches the Forældre Ro card style (white on cream). */}
      <div
        className="rounded-card bg-white p-4 sm:p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex justify-center pt-4 sm:pt-6 md:pt-10">
          {/* Compact variant keeps the bottom trim gentle so the plant
              pot doesn't overlap into the subject grid below. The pt-*
              classes counter the variant's negative top margin so the
              plant sits lower in the card instead of crowding the top
              edge. */}
          <TavleHeroIllustration maxWidth={520} variant="compact" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map(s => {
            const list = grouped[s]
            const total = list.length
            const done = list.filter(t => t.status === "done").length
            const inProgress = list.filter(t => t.status === "in_progress").length
            const pending = list.filter(t => t.status === "pending").length
            const pct = total === 0 ? 0 : Math.round((done / total) * 100)
            const def = SUBJECT_DEF[s]
            const countLabel =
              total === 0
                ? messages.subjectOpgaverNone
                : `${total} ${
                    total === 1
                      ? messages.subjectOpgaverSingular
                      : messages.subjectOpgaverPlural
                  }`
            // Status sub-label under the progress bar. The previous
            // "open = total - done" lumped pending + in_progress under
            // "ikke startet", which read wrong when the kid was already
            // working on the task. Prefer "I gang" when anything is in
            // progress, fall back to "ikke startet" only when nothing
            // has been touched yet.
            const subLabel =
              inProgress > 0
                ? `${inProgress} ${
                    inProgress === 1
                      ? messages.subjectOpgaverSingular
                      : messages.subjectOpgaverPlural
                  } ${messages.tabInProgress.toLowerCase()}`
                : pending > 0
                  ? `${pending} ${
                      pending === 1
                        ? messages.subjectOpgaverSingular
                        : messages.subjectOpgaverPlural
                    } ${messages.tabPending.toLowerCase()}`
                  : null
            return (
              <button
                key={s}
                type="button"
                onClick={() => setOpenSubject(s)}
                className="flex flex-col items-start gap-3 rounded-card p-4 text-left transition hover:-translate-y-0.5 cursor-pointer"
                style={{
                  background: def.tint,
                  boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset, 0 6px 18px -10px rgba(31,45,26,0.18)",
                }}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <span aria-hidden className="shrink-0">
                    {def.glyph}
                  </span>
                  <div className="min-w-0 text-right">
                    <div
                      className="text-lg font-semibold text-ink"
                      style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
                    >
                      {messages.subjects[s] ?? s}
                    </div>
                    <div className="text-xs text-ink/60">{countLabel}</div>
                  </div>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/65">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: def.bar }}
                  />
                </div>
                {subLabel && (
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/55">
                    {subLabel}
                  </div>
                )}
              </button>
            )
          })}
        </div>

      </div>

      {/* Bottom CTA — adds tasks to the board. Hidden for young kids. */}
      {showNewCta && (
        <Link
          href={newTaskHref}
          className="mx-auto inline-flex w-full max-w-xl items-center gap-3 rounded-card border border-ink/8 bg-white/70 px-5 py-4 text-left transition hover:bg-white cursor-pointer"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span
            aria-hidden
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: "#7ACBA2" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span className="flex-1">
            <span
              className="block text-sm font-semibold text-ink"
              style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
            >
              {messages.addTaskCta}
            </span>
          </span>
        </Link>
      )}
    </div>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({
  title,
  subtitle,
  showChildPicker,
  children,
  selectedChildId,
  onChangeChild,
  allLabel,
  pickerLabel,
}: {
  title: string
  subtitle: string
  showChildPicker: boolean
  children: { id: string; name: string }[]
  selectedChildId: string | null
  onChangeChild: (id: string | null) => void
  allLabel: string
  pickerLabel: string
}) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1
            className="text-3xl font-bold text-ink md:text-4xl"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {title}
          </h1>
          <p className="text-sm text-ink/60">{subtitle}</p>
        </div>
        {showChildPicker && (
          <ChildPicker
            children={children}
            selectedChildId={selectedChildId}
            onChange={onChangeChild}
            allLabel={allLabel}
            label={pickerLabel}
          />
        )}
      </div>
    </header>
  )
}

function ChildPicker({
  children,
  selectedChildId,
  onChange,
  allLabel,
  label,
}: {
  children: { id: string; name: string }[]
  selectedChildId: string | null
  onChange: (id: string | null) => void
  allLabel: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const selected = selectedChildId
    ? children.find(c => c.id === selectedChildId)?.name ?? allLabel
    : allLabel
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-canvas cursor-pointer"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <span
          aria-hidden
          className="inline-flex h-2 w-2 rounded-full"
          style={{ background: selectedChildId ? "#5C9D6E" : "rgba(31,45,26,0.25)" }}
        />
        {selected}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          {/* Click-outside scrim */}
          <button
            type="button"
            aria-label="Luk menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />
          <ul
            role="listbox"
            className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-card border border-ink/8 bg-white py-1"
            style={{ boxShadow: "0 18px 36px -16px rgba(31,45,26,0.22)" }}
          >
            <PickerItem
              active={!selectedChildId}
              dotColor="rgba(31,45,26,0.3)"
              onClick={() => { onChange(null); setOpen(false) }}
            >
              {allLabel}
            </PickerItem>
            {children.map(c => (
              <PickerItem
                key={c.id}
                active={selectedChildId === c.id}
                dotColor="#5C9D6E"
                onClick={() => { onChange(c.id); setOpen(false) }}
              >
                {c.name}
              </PickerItem>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function PickerItem({
  active,
  dotColor,
  onClick,
  children,
}: {
  active: boolean
  dotColor: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onClick}
        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition cursor-pointer ${
          active ? "bg-mint-soft text-ink" : "text-ink/80 hover:bg-canvas"
        }`}
      >
        <span
          aria-hidden
          className="inline-flex h-2 w-2 rounded-full"
          style={{ background: dotColor }}
        />
        {children}
        {active && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ml-auto text-mint-deep">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    </li>
  )
}

// ─── Subject detail ──────────────────────────────────────────────────────────

type Tab = "all" | "pending" | "in_progress" | "done"

function SubjectDetail({
  locale,
  mode,
  subject,
  subjectLabel,
  tasks,
  childNames,
  showAddCta,
  addCtaHref,
  onBack,
  onDismiss,
  busyId,
  messages,
}: {
  locale: string
  mode: Mode
  subject: TaskSubject
  subjectLabel: string
  tasks: TaskRow[]
  childNames?: Record<string, string>
  showAddCta: boolean
  addCtaHref: string
  onBack: () => void
  onDismiss: (taskId: string) => void
  busyId: string | null
  messages: TavleMessages
}) {
  const [tab, setTab] = useState<Tab>("all")
  const def = SUBJECT_DEF[subject]
  const total = tasks.length
  const done = tasks.filter(t => t.status === "done").length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const counts = {
    all: total,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done,
  }

  const filtered =
    tab === "all" ? tasks : tasks.filter(t => statusToTab(t.status) === tab)

  return (
    <div className="flex w-full flex-col gap-4 pb-12 md:pb-16">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm font-medium text-ink/60 hover:text-ink cursor-pointer"
      >
        ← {messages.detailBack}
      </button>

      {/* Header card — subject identity, hero plant decoration and
          progress in one block. Following the Forældre Ro pattern
          (white card on cream canvas), no outer container around the
          whole view. */}
      <div
        className="rounded-card bg-white p-4 sm:p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: def.tint }}
            >
              {def.glyph}
            </span>
            <div>
              <h2
                className="text-2xl font-bold text-ink md:text-3xl"
                style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
              >
                {subjectLabel}
              </h2>
              <p className="text-sm text-ink/55">
                {total === 1
                  ? messages.detailTotalOne
                  : messages.detailTotal.replace("{n}", String(total))}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-xs font-semibold tabular-nums text-ink/65">
                {messages.detailDoneOf
                  .replace("{done}", String(done))
                  .replace("{total}", String(total))}
              </span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink/8">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: def.bar }}
                />
              </div>
            </div>
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: "#FBEBC2" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#D6B850" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l2.6 6.6L22 9.5l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.7L2 9.5l7.4-.9L12 2z" stroke="#A07F22" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>

        {/* Tabs sit inside the header card so the filter UI lives with
            the subject context it filters. */}
        <div className="mt-5 flex flex-wrap gap-1.5 border-t border-ink/8 pt-5">
          {([
            { id: "all" as Tab, label: messages.tabAll },
            { id: "pending" as Tab, label: messages.tabPending },
            { id: "in_progress" as Tab, label: messages.tabInProgress },
            { id: "done" as Tab, label: messages.tabDone },
          ]).map(t => {
            const active = tab === t.id
            const count = counts[t.id]
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                  active
                    ? "bg-mint-deep text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.14),0_4px_10px_-3px_rgba(31,45,26,0.28)]"
                    : "bg-white text-ink/65 ring-1 ring-inset ring-ink/[0.08] hover:bg-canvas-warm/40"
                }`}
              >
                {t.label}
                <span
                  className={`inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                    active
                      ? "bg-[#2E5840] text-white"
                      : "bg-canvas-warm/80 text-ink/55"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Task list — solo tasks render as a single card; tasks sharing a
          task_group_id (multi-task submission from one homework photo)
          render as a single bundle card with the children inside. Order
          preserved from the underlying `filtered` array — the first
          appearance of a group_id determines where the bundle sits. */}
      <ul className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <li
            className="rounded-card bg-white p-6 text-center text-sm text-ink/55"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {tab === "done"
              ? "Ingen færdige opgaver endnu."
              : "Ingen opgaver i denne kategori."}
          </li>
        ) : (
          groupTasksByBundle(filtered).map(entry => {
            if (entry.kind === "solo") {
              const t = entry.task
              return (
                <DetailTaskRow
                  key={t.id}
                  locale={locale}
                  task={t}
                  childName={mode === "parent" ? childNames?.[t.childId] : null}
                  showDismiss={mode === "parent" && t.status !== "done"}
                  busy={busyId === t.id}
                  onDismiss={() => onDismiss(t.id)}
                  messages={messages}
                />
              )
            }
            return (
              <DetailTaskBundle
                key={entry.groupId}
                locale={locale}
                tasks={entry.tasks}
                childName={
                  mode === "parent" ? childNames?.[entry.tasks[0].childId] : null
                }
                showDismiss={mode === "parent"}
                busyId={busyId}
                onDismiss={onDismiss}
                messages={messages}
              />
            )
          })
        )}
      </ul>

      {/* Bottom CTA — centred on the canvas, no outer container. `flex`
          (not `inline-flex`) so `mx-auto` actually centres it. */}
      {showAddCta && (
        <Link
          href={addCtaHref}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-btn border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-canvas cursor-pointer"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white"
            style={{ background: "#7ACBA2" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          {messages.addTaskCta}
        </Link>
      )}
    </div>
  )
}

function statusToTab(status: TaskStatus): Tab {
  if (status === "pending") return "pending"
  if (status === "in_progress") return "in_progress"
  if (status === "done") return "done"
  return "pending"
}

function DetailTaskRow({
  locale,
  task,
  childName,
  showDismiss,
  busy,
  onDismiss,
  messages,
  compact = false,
}: {
  locale: string
  task: TaskRow
  childName?: string | null
  showDismiss: boolean
  busy: boolean
  onDismiss: () => void
  messages: TavleMessages
  /** When true, renders inline inside a bundle: no own card chrome (the
   *  bundle wrapper provides background + shadow), thin top divider on
   *  every row except the first, smaller padding. */
  compact?: boolean
}) {
  const status = task.status
  const dimmed = status === "done"
  const statusInfo = STATUS_INFO[status]
  // Hash-pick a school-supply icon from a pool — gives every task a
  // stable, recognisable left-side glyph without drawing N unique icons
  // up front. Same task.id always lands on the same icon.
  const icon = pickTaskIcon(task.id)
  const rowClass = compact
    ? `relative transition first:border-t-0 border-t border-ink/8 ${
        dimmed ? "opacity-70" : ""
      }`
    : `relative rounded-card bg-white transition hover:-translate-y-0.5 ${
        dimmed ? "opacity-70" : ""
      }`
  return (
    <li
      className={rowClass}
      style={compact ? undefined : { boxShadow: "var(--shadow-card)" }}
    >
      <Link
        href={`/${locale}/parent/tasks/${task.id}`}
        className="flex items-center gap-4 p-4 sm:p-5 cursor-pointer"
      >
        {/* Left: hash-picked school-supply icon in tinted square. */}
        <span
          aria-hidden
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
          style={{ background: icon.tint }}
        >
          {icon.glyph}
        </span>

        {/* Middle: title + body + status pill stack. */}
        <div className="min-w-0 flex-1">
          <p
            className={`reading-task-title text-base font-semibold sm:text-lg ${
              dimmed ? "text-ink/55 line-through" : "text-ink"
            }`}
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {task.title || shortText(task.text)}
          </p>
          <p className="reading-body mt-0.5 line-clamp-2 text-sm text-ink/60">
            {childName && <span className="font-medium text-ink/70">{childName} · </span>}
            {task.title && task.text ? shortText(task.text) : task.goal ?? ""}
          </p>
          <span
            className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: statusInfo.pillBg, color: statusInfo.pillFg }}
          >
            {status === "pending" && messages.statusPending}
            {status === "in_progress" && messages.statusInProgress}
            {status === "done" && messages.statusDone}
          </span>
        </div>

        <span aria-hidden className="text-2xl text-ink/30">›</span>
      </Link>

      {/* Parent-only dismiss — sits absolute so it doesn't interfere with
          the row Link's click target. Top-right corner. */}
      {showDismiss && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onDismiss() }}
          disabled={busy}
          title="Fjern fra tavlen"
          aria-label="Fjern fra tavlen"
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-ink/45 transition hover:bg-white hover:text-clay cursor-pointer disabled:opacity-40"
          style={{ boxShadow: "0 2px 4px rgba(31,45,26,0.08)" }}
        >
          ×
        </button>
      )}
    </li>
  )
}

// ─── Bundle grouping ─────────────────────────────────────────────────────────
// Tasks extracted from one homework photo (parent's "add to board" submit)
// share a task_group_id and should render as a single expandable card —
// "1 sæt med 5 opgaver" — instead of N independent cards that hide their
// origin. Solo tasks (no group_id, or only one visible task in the group)
// render unchanged.

type BundleEntry =
  | { kind: "solo"; task: TaskRow }
  | { kind: "bundle"; groupId: string; tasks: TaskRow[] }

function groupTasksByBundle(tasks: TaskRow[]): BundleEntry[] {
  // First pass: count how many tasks each group has in the visible list,
  // so a group that's been filtered down to one task collapses back to a
  // solo card (no point in a "1 opgave fra dette sæt" wrapper).
  const groupCounts = new Map<string, number>()
  for (const t of tasks) {
    if (!t.taskGroupId) continue
    groupCounts.set(t.taskGroupId, (groupCounts.get(t.taskGroupId) ?? 0) + 1)
  }
  // Second pass: emit one entry per group (at the first appearance), or
  // one entry per solo task. Preserves the input ordering for non-grouped
  // tasks and for the bundle's anchor position.
  const seen = new Set<string>()
  const entries: BundleEntry[] = []
  for (const t of tasks) {
    if (t.taskGroupId && (groupCounts.get(t.taskGroupId) ?? 0) > 1) {
      if (seen.has(t.taskGroupId)) continue
      seen.add(t.taskGroupId)
      entries.push({
        kind: "bundle",
        groupId: t.taskGroupId,
        tasks: tasks.filter(x => x.taskGroupId === t.taskGroupId),
      })
    } else {
      entries.push({ kind: "solo", task: t })
    }
  }
  return entries
}

function DetailTaskBundle({
  locale,
  tasks,
  childName,
  showDismiss,
  busyId,
  onDismiss,
  messages,
}: {
  locale: string
  tasks: TaskRow[]
  childName?: string | null
  showDismiss: boolean
  busyId: string | null
  onDismiss: (id: string) => void
  messages: TavleMessages
}) {
  // Default collapsed — bundles are scannable as one row each, and once a
  // parent has many homework photos on the board, defaulting open turns
  // the page back into a wall of rows.
  const [open, setOpen] = useState(false)
  const total = tasks.length
  const doneCount = tasks.filter(t => t.status === "done").length
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length
  // Roll-up status for the outer pill.
  const rolledStatus: TaskStatus =
    doneCount === total ? "done"
      : inProgressCount > 0 || doneCount > 0 ? "in_progress"
      : "pending"
  const rolledStatusInfo = STATUS_INFO[rolledStatus]
  // Stable icon for the bundle from its group id — same set always picks
  // the same glyph so the Tavle stays recognisable across visits.
  const icon = pickTaskIcon(tasks[0].taskGroupId ?? tasks[0].id)
  const dimmed = rolledStatus === "done"
  const groupId = tasks[0].taskGroupId
  const startAllHref = groupId ? `/${locale}/parent/groups/${groupId}` : null
  const allDone = doneCount === total
  return (
    <li
      className={`rounded-card bg-white transition ${dimmed ? "opacity-80" : ""}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="relative flex w-full items-center gap-4 p-4 sm:p-5">
        {/* Big-target toggle: icon + title + chevron act as one click area
            so the kid doesn't have to aim at the small chevron. The
            "Start alle" Link sits on top with `relative z-10` and
            stopPropagation so its clicks don't bubble back into the
            toggle. */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? "Skjul opgaver" : "Vis opgaver"}
          className="absolute inset-0 cursor-pointer rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-deep/40"
        />
        <span
          aria-hidden
          className="pointer-events-none relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
          style={{ background: icon.tint }}
        >
          {icon.glyph}
        </span>
        <div className="pointer-events-none relative min-w-0 flex-1">
          <p
            className="reading-task-title text-base font-semibold text-ink sm:text-lg"
            style={{ fontFamily: "var(--font-fraunces), var(--font-display)" }}
          >
            {tasks[0].taskGroupTitle || `${total} opgaver fra ét lektiebillede`}
          </p>
          <p className="reading-body mt-0.5 line-clamp-1 text-sm text-ink/60">
            {childName && <span className="font-medium text-ink/70">{childName} · </span>}
            {doneCount} af {total} færdige
          </p>
          <span
            className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: rolledStatusInfo.pillBg, color: rolledStatusInfo.pillFg }}
          >
            {rolledStatus === "pending" && messages.statusPending}
            {rolledStatus === "in_progress" && messages.statusInProgress}
            {rolledStatus === "done" && messages.statusDone}
          </span>
        </div>
        {/* "Start alle" routes to the multi-pick screen (TaskPicker)
            seeded with the bundle's tasks. relative + z-10 lifts it
            above the absolute toggle button; onClick stopPropagation
            keeps a tap on the green pill from also opening the inline
            list. */}
        {startAllHref && !allDone && (
          <Link
            href={startAllHref}
            onClick={e => e.stopPropagation()}
            className="relative z-10 hidden shrink-0 items-center gap-1.5 rounded-btn bg-primary px-5 py-2.5 text-sm font-bold text-ink transition hover:opacity-90 cursor-pointer sm:inline-flex"
            style={{ boxShadow: "0 4px 12px -4px rgba(122,203,162,0.55)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
            Start alle
          </Link>
        )}
        <span
          aria-hidden
          className="pointer-events-none relative shrink-0 text-2xl text-ink/40 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ›
        </span>
      </div>
      {/* Mobile: "Start alle" sits on its own row under the header
          because there isn't horizontal room next to a 14×14 icon +
          title stack. Desktop hides this in favour of the inline button
          to keep the row visually identical to a solo task card. */}
      {startAllHref && !allDone && (
        <Link
          href={startAllHref}
          className="mx-4 mb-3 inline-flex items-center justify-center gap-1.5 rounded-btn bg-primary px-4 py-2.5 text-sm font-bold text-ink transition hover:opacity-90 cursor-pointer sm:hidden"
          style={{ boxShadow: "0 4px 12px -4px rgba(122,203,162,0.55)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          Start alle
        </Link>
      )}
      {open && (
        <ul className="border-t border-ink/8 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          {tasks.map(t => (
            <DetailTaskRow
              key={t.id}
              locale={locale}
              task={t}
              childName={null}
              showDismiss={showDismiss && t.status !== "done"}
              busy={busyId === t.id}
              onDismiss={() => onDismiss(t.id)}
              messages={messages}
              compact
            />
          ))}
        </ul>
      )}
    </li>
  )
}

const STATUS_INFO: Record<TaskStatus, { ring: string; pillBg: string; pillFg: string }> = {
  pending:     { ring: "rgba(31,45,26,0.18)", pillBg: "rgba(31,45,26,0.06)", pillFg: "rgba(31,45,26,0.65)" },
  in_progress: { ring: "#D6B850",             pillBg: "#FBEFD7",             pillFg: "#7A5A1F" },
  done:        { ring: "#5C9D6E",             pillBg: "#E1EEDD",             pillFg: "#4F8E6B" },
  dismissed:   { ring: "rgba(31,45,26,0.12)", pillBg: "rgba(31,45,26,0.06)", pillFg: "rgba(31,45,26,0.45)" },
}

// ─── Hash-picked task icon ───────────────────────────────────────────────────
// Each task gets a stable left-side school-supply icon picked from a pool
// by hashing the task id. Same task always renders the same icon; sibling
// tasks usually differ so the list has visual variety. Pool size doesn't
// have to match the number of tasks — duplicates are fine, the
// determinism is what matters.

function pickTaskIcon(taskId: string): { tint: string; glyph: React.ReactNode } {
  let h = 5381
  for (let i = 0; i < taskId.length; i++) {
    h = ((h << 5) + h + taskId.charCodeAt(i)) >>> 0
  }
  return TASK_ICON_POOL[h % TASK_ICON_POOL.length]
}

const TASK_ICON_POOL: Array<{ tint: string; glyph: React.ReactNode }> = [
  // Pencils — yellow + sand variants in different angles.
  { tint: "#FBEBC2", glyph: <PencilGlyph color="#D6B850" rotation={-25} /> },
  { tint: "#E8DEF1", glyph: <PencilGlyph color="#7A5A9C" rotation={20} /> },
  { tint: "#E1EEDD", glyph: <PencilGlyph color="#5C9D6E" rotation={-10} /> },
  { tint: "#F4DBD1", glyph: <PencilGlyph color="#A05844" rotation={35} /> },
  // Crayon (chunky pencil with band).
  { tint: "#FBEBC2", glyph: <CrayonGlyph color="#D6B850" /> },
  { tint: "#E8DEF1", glyph: <CrayonGlyph color="#7A5A9C" /> },
  { tint: "#F4DBD1", glyph: <CrayonGlyph color="#A05844" /> },
  // Marker / felt-tip with cap.
  { tint: "#E1EEDD", glyph: <MarkerGlyph color="#5C9D6E" /> },
  { tint: "#E8DEF1", glyph: <MarkerGlyph color="#7A5A9C" /> },
  // Eraser — small block.
  { tint: "#FBEBC2", glyph: <EraserGlyph /> },
  { tint: "#F4DBD1", glyph: <EraserGlyph /> },
  // Ruler — diagonal.
  { tint: "#E1EEDD", glyph: <RulerGlyph /> },
  { tint: "#FBEBC2", glyph: <RulerGlyph /> },
  // Paintbrush.
  { tint: "#FBEBC2", glyph: <PaintbrushGlyph color="#D6B850" /> },
  { tint: "#E8DEF1", glyph: <PaintbrushGlyph color="#7A5A9C" /> },
  // Open notebook with lines.
  { tint: "#E1EEDD", glyph: <NotebookGlyph /> },
  { tint: "#F4DBD1", glyph: <NotebookGlyph /> },
  // Sharpener.
  { tint: "#E1EEDD", glyph: <SharpenerGlyph /> },
  // Sticky-note.
  { tint: "#FBEBC2", glyph: <StickyNoteGlyph /> },
]

// ─── Icon glyphs (24×24 viewBox, ink stroke, soft fills) ─────────────────────
// Drawn at 26 (rendered) inside a 56–64px tinted tile.

function PencilGlyph({ color, rotation = 0 }: { color: string; rotation?: number }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg" style={{ transform: `rotate(${rotation}deg)` }}>
      {/* Body */}
      <rect x="6" y="3" width="6" height="14" rx="1" fill={color} stroke="#1F2D1A" strokeWidth="1.4" />
      {/* Ferrule */}
      <rect x="6" y="14" width="6" height="2.4" fill="#A07F22" stroke="#1F2D1A" strokeWidth="1.2" />
      {/* Eraser */}
      <rect x="6" y="16.4" width="6" height="3" rx="1" fill="#E89B82" stroke="#1F2D1A" strokeWidth="1.4" />
      {/* Tip */}
      <path d="M6 3 L9 -1 L12 3 z" transform="translate(0 0)" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 1.5 L9 -0.5 L11 1.5" stroke="#1F2D1A" strokeWidth="1" fill="none" />
    </svg>
  )
}

function CrayonGlyph({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M9 4 L15 4 L15 19 L12 22 L9 19 z" fill={color} stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="9" y="6.5" width="6" height="3" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.2" />
      <rect x="9" y="13" width="6" height="3" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.2" />
    </svg>
  )
}

function MarkerGlyph({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      {/* Cap */}
      <rect x="7" y="2" width="10" height="6" rx="1.5" fill={color} stroke="#1F2D1A" strokeWidth="1.4" />
      {/* Body */}
      <rect x="7.5" y="8" width="9" height="13" rx="1" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.4" />
      <rect x="7.5" y="11" width="9" height="2" fill={color} opacity="0.6" />
    </svg>
  )
}

function EraserGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M5 14 L13 6 L20 13 L12 21 z" fill="#E89B82" stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5 14 L12 21 L17 16 L10 9 z" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function RulerGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-30 12 12)">
        <rect x="2" y="9" width="20" height="6" rx="1" fill="#FBEBC2" stroke="#1F2D1A" strokeWidth="1.4" />
        <path d="M5 9 L5 11.5 M8 9 L8 13 M11 9 L11 11.5 M14 9 L14 13 M17 9 L17 11.5 M20 9 L20 13" stroke="#1F2D1A" strokeWidth="1" />
      </g>
    </svg>
  )
}

function PaintbrushGlyph({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M3 21 L9 21 L13 13 L11 11 z" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11 11 L19 3 L21 5 L13 13 z" fill={color} stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="0.7" fill="#1F2D1A" />
      <circle cx="8" cy="16" r="0.5" fill="#1F2D1A" opacity="0.6" />
    </svg>
  )
}

function NotebookGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4 H 18 A 2 2 0 0 1 20 6 V 20 H 4 A 0 0 0 0 1 4 20 z" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M4 4 V 20" stroke="#A05844" strokeWidth="1.6" />
      <path d="M8 9 L17 9 M8 13 L17 13 M8 17 L13 17" stroke="#1F2D1A" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function SharpenerGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="14" height="10" rx="1.5" fill="#5C9D6E" stroke="#1F2D1A" strokeWidth="1.4" />
      <rect x="6" y="10.5" width="10" height="5" fill="#FFF8EA" stroke="#1F2D1A" strokeWidth="1.2" />
      <path d="M16 10.5 L20 6 L20 14 z" fill="#D6B850" stroke="#1F2D1A" strokeWidth="1.2" />
    </svg>
  )
}

function StickyNoteGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4 H 17 L 20 7 V 20 H 4 z" fill="#FBEBC2" stroke="#1F2D1A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M17 4 V 7 H 20" fill="none" stroke="#1F2D1A" strokeWidth="1.2" />
      <path d="M7 11 L16 11 M7 14 L16 14 M7 17 L13 17" stroke="#1F2D1A" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortText(text: string): string {
  if (text.length <= 70) return text
  return text.slice(0, 70).trimEnd() + "…"
}
