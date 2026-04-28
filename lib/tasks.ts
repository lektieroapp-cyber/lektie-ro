import { createAdminClient } from "@/lib/supabase/admin"
import type { Task, TaskStep } from "@/components/session/types"

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "in_progress" | "done" | "dismissed"
export type TaskSubject = "matematik" | "dansk" | "engelsk" | "tysk"

export const TASK_SUBJECTS: TaskSubject[] = ["matematik", "dansk", "engelsk"]

/** A row from public.tasks, normalised for the app. JSON columns parsed. */
export type TaskRow = {
  id: string
  childId: string
  parentId: string
  subject: TaskSubject
  title: string | null
  text: string
  type: string
  goal: string | null
  steps: TaskStep[] | null
  context: string | null
  needsPaper: boolean | null
  sourceImagePath: string | null
  status: TaskStatus
  approvedByParent: boolean
  /** Shared id for tasks extracted from the same homework photo / parent
   *  submission. Null on legacy single-task rows (pre-015). When set, the
   *  kid task page uses it to route to the next open sibling on completion
   *  instead of dumping back to the empty board. */
  taskGroupId: string | null
  /** Vision extractor's confidence in the completion criteria. The tutor
   *  prompt branches on this — "low" lets the kid signal done with no
   *  friction; "high" can hold them to all steps. Defaults to "medium". */
  completionCertainty: "high" | "medium" | "low"
  createdAt: string
  updatedAt: string
  approvedAt: string | null
  completedAt: string | null
  dismissedAt: string | null
}

// ─── Row mapping ─────────────────────────────────────────────────────────────

type DbRow = {
  id: string
  child_id: string
  parent_id: string
  subject: string
  task_title: string | null
  task_text: string
  task_type: string
  task_goal: string | null
  task_steps: TaskStep[] | null
  task_context: string | null
  needs_paper: boolean | null
  source_image_path: string | null
  status: string
  approved_by_parent: boolean
  task_group_id: string | null
  completion_certainty: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  completed_at: string | null
  dismissed_at: string | null
}

const SELECT_COLS =
  "id, child_id, parent_id, subject, task_title, task_text, task_type, " +
  "task_goal, task_steps, task_context, needs_paper, source_image_path, " +
  "status, approved_by_parent, task_group_id, completion_certainty, " +
  "created_at, updated_at, approved_at, " +
  "completed_at, dismissed_at"

function mapRow(r: DbRow): TaskRow {
  return {
    id: r.id,
    childId: r.child_id,
    parentId: r.parent_id,
    subject: r.subject as TaskSubject,
    title: r.task_title,
    text: r.task_text,
    type: r.task_type,
    goal: r.task_goal,
    steps: r.task_steps,
    context: r.task_context,
    needsPaper: r.needs_paper,
    sourceImagePath: r.source_image_path,
    status: r.status as TaskStatus,
    approvedByParent: r.approved_by_parent,
    taskGroupId: r.task_group_id,
    completionCertainty:
      r.completion_certainty === "high" || r.completion_certainty === "low"
        ? r.completion_certainty
        : "medium",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    approvedAt: r.approved_at,
    completedAt: r.completed_at,
    dismissedAt: r.dismissed_at,
  }
}

/** Convert a TaskRow back into the in-memory Task shape HintChat expects. */
export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title ?? undefined,
    text: row.text,
    type: row.type,
    goal: row.goal ?? undefined,
    needsPaper: row.needsPaper ?? undefined,
    steps: row.steps ?? undefined,
    context: row.context ?? undefined,
    completionCertainty: row.completionCertainty,
  }
}

// ─── Reads ───────────────────────────────────────────────────────────────────

/** Open (pending or in_progress, approved) tasks for the kid's board. */
export async function fetchOpenTasksForChild(
  parentId: string,
  childId: string,
): Promise<TaskRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tasks")
    .select(SELECT_COLS)
    .eq("parent_id", parentId)
    .eq("child_id", childId)
    .eq("approved_by_parent", true)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
  if (error) throw new Error(`fetchOpenTasksForChild: ${error.message}`)
  return (data as unknown as DbRow[] | null)?.map(mapRow) ?? []
}

/** All open tasks for the parent board (every child). */
export async function fetchOpenTasksForParent(parentId: string): Promise<TaskRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tasks")
    .select(SELECT_COLS)
    .eq("parent_id", parentId)
    .eq("approved_by_parent", true)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
  if (error) throw new Error(`fetchOpenTasksForParent: ${error.message}`)
  return (data as unknown as DbRow[] | null)?.map(mapRow) ?? []
}

/** Approved tasks (open + done) for the kid's board. Excludes dismissed.
 *  Used by the subject-detail view so the "Færdige" tab has data. */
export async function fetchAllTasksForChild(
  parentId: string,
  childId: string,
): Promise<TaskRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tasks")
    .select(SELECT_COLS)
    .eq("parent_id", parentId)
    .eq("child_id", childId)
    .eq("approved_by_parent", true)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`fetchAllTasksForChild: ${error.message}`)
  return (data as unknown as DbRow[] | null)?.map(mapRow) ?? []
}

/** Approved tasks (open + done) for the parent board across all kids. */
export async function fetchAllTasksForParent(parentId: string): Promise<TaskRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tasks")
    .select(SELECT_COLS)
    .eq("parent_id", parentId)
    .eq("approved_by_parent", true)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`fetchAllTasksForParent: ${error.message}`)
  return (data as unknown as DbRow[] | null)?.map(mapRow) ?? []
}

/** Tasks awaiting parent approval (review queue). */
export async function fetchPendingReview(parentId: string): Promise<TaskRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tasks")
    .select(SELECT_COLS)
    .eq("parent_id", parentId)
    .eq("approved_by_parent", false)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
  if (error) throw new Error(`fetchPendingReview: ${error.message}`)
  return (data as unknown as DbRow[] | null)?.map(mapRow) ?? []
}

/** Single task by id, scoped to parent. Null when not found / wrong owner. */
export async function fetchTaskById(
  parentId: string,
  taskId: string,
): Promise<TaskRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tasks")
    .select(SELECT_COLS)
    .eq("id", taskId)
    .eq("parent_id", parentId)
    .maybeSingle()
  if (error) throw new Error(`fetchTaskById: ${error.message}`)
  return data ? mapRow(data as unknown as DbRow) : null
}

/** Count of pending-review tasks (for the sidebar badge). */
export async function countPendingReview(parentId: string): Promise<number> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parentId)
    .eq("approved_by_parent", false)
    .neq("status", "dismissed")
  if (error) throw new Error(`countPendingReview: ${error.message}`)
  return count ?? 0
}

// ─── Writes ──────────────────────────────────────────────────────────────────

export type CreateTaskInput = {
  childId: string
  subject: TaskSubject
  title?: string | null
  text: string
  type?: string
  goal?: string | null
  steps?: TaskStep[] | null
  context?: string | null
  needsPaper?: boolean | null
  sourceImagePath?: string | null
  /** Shared group id for batches extracted from the same photo / parent
   *  submission. Pass the same id on every task in a batch; null/omit for
   *  legacy single-task rows. */
  taskGroupId?: string | null
  completionCertainty?: "high" | "medium" | "low"
  /** Default true — board flow inserts already-approved rows. */
  approve?: boolean
}

export async function createTask(
  parentId: string,
  input: CreateTaskInput,
): Promise<TaskRow> {
  const admin = createAdminClient()
  const approve = input.approve !== false
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from("tasks")
    .insert({
      parent_id: parentId,
      child_id: input.childId,
      subject: input.subject,
      task_title: input.title ?? null,
      task_text: input.text,
      task_type: input.type ?? "task",
      task_goal: input.goal ?? null,
      task_steps: input.steps ?? null,
      task_context: input.context ?? null,
      needs_paper: input.needsPaper ?? null,
      source_image_path: input.sourceImagePath ?? null,
      task_group_id: input.taskGroupId ?? null,
      completion_certainty: input.completionCertainty ?? "medium",
      status: "pending",
      approved_by_parent: approve,
      approved_at: approve ? now : null,
    })
    .select(SELECT_COLS)
    .single()
  if (error) throw new Error(`createTask: ${error.message}`)
  return mapRow(data as unknown as DbRow)
}

export type TaskPatch = {
  title?: string | null
  text?: string
  type?: string
  goal?: string | null
  steps?: TaskStep[] | null
  context?: string | null
  needsPaper?: boolean | null
  status?: TaskStatus
  approvedByParent?: boolean
}

export async function updateTask(
  parentId: string,
  taskId: string,
  patch: TaskPatch,
): Promise<TaskRow | null> {
  const admin = createAdminClient()
  const update: Record<string, unknown> = {}
  if (patch.title !== undefined) update.task_title = patch.title
  if (patch.text !== undefined) update.task_text = patch.text
  if (patch.type !== undefined) update.task_type = patch.type
  if (patch.goal !== undefined) update.task_goal = patch.goal
  if (patch.steps !== undefined) update.task_steps = patch.steps
  if (patch.context !== undefined) update.task_context = patch.context
  if (patch.needsPaper !== undefined) update.needs_paper = patch.needsPaper
  if (patch.status !== undefined) {
    update.status = patch.status
    const now = new Date().toISOString()
    if (patch.status === "done") update.completed_at = now
    if (patch.status === "dismissed") update.dismissed_at = now
  }
  if (patch.approvedByParent !== undefined) {
    update.approved_by_parent = patch.approvedByParent
    if (patch.approvedByParent) update.approved_at = new Date().toISOString()
  }
  if (Object.keys(update).length === 0) {
    return fetchTaskById(parentId, taskId)
  }
  const { data, error } = await admin
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("parent_id", parentId)
    .select(SELECT_COLS)
    .maybeSingle()
  if (error) throw new Error(`updateTask: ${error.message}`)
  return data ? mapRow(data as unknown as DbRow) : null
}

/** Bump status to in_progress if currently pending. Used when a session starts. */
export async function markTaskInProgress(parentId: string, taskId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from("tasks")
    .update({ status: "in_progress" })
    .eq("id", taskId)
    .eq("parent_id", parentId)
    .eq("status", "pending")
}

export async function markTaskDone(parentId: string, taskId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("parent_id", parentId)
}

/** Insert a batch of tasks under one shared task_group_id. Returns the
 *  created rows in input order. Used by the parent "submit a homework
 *  photo" flow so all tasks from one image share a group, mirroring the
 *  kid-takes-photo session where finishing one task lands the kid on a
 *  picker with the remaining siblings. */
export async function createTaskBatch(
  parentId: string,
  inputs: CreateTaskInput[],
): Promise<{ groupId: string; tasks: TaskRow[] }> {
  if (inputs.length === 0) return { groupId: "", tasks: [] }
  const admin = createAdminClient()
  const groupId = crypto.randomUUID()
  const now = new Date().toISOString()
  const rows = inputs.map(input => {
    const approve = input.approve !== false
    return {
      parent_id: parentId,
      child_id: input.childId,
      subject: input.subject,
      task_title: input.title ?? null,
      task_text: input.text,
      task_type: input.type ?? "task",
      task_goal: input.goal ?? null,
      task_steps: input.steps ?? null,
      task_context: input.context ?? null,
      needs_paper: input.needsPaper ?? null,
      source_image_path: input.sourceImagePath ?? null,
      task_group_id: groupId,
      completion_certainty: input.completionCertainty ?? "medium",
      status: "pending",
      approved_by_parent: approve,
      approved_at: approve ? now : null,
    }
  })
  const { data, error } = await admin
    .from("tasks")
    .insert(rows)
    .select(SELECT_COLS)
  if (error) throw new Error(`createTaskBatch: ${error.message}`)
  return {
    groupId,
    tasks: (data as unknown as DbRow[] | null)?.map(mapRow) ?? [],
  }
}

/** Next open (pending or in_progress) sibling in the same task group, scoped
 *  to the given child. Returns the oldest still-open task other than the one
 *  the kid just finished, or null when the group is empty / fully done. */
export async function nextOpenSiblingInGroup(
  parentId: string,
  childId: string,
  taskGroupId: string,
  excludeTaskId: string,
): Promise<TaskRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("tasks")
    .select(SELECT_COLS)
    .eq("parent_id", parentId)
    .eq("child_id", childId)
    .eq("task_group_id", taskGroupId)
    .eq("approved_by_parent", true)
    .in("status", ["pending", "in_progress"])
    .neq("id", excludeTaskId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`nextOpenSiblingInGroup: ${error.message}`)
  return data ? mapRow(data as unknown as DbRow) : null
}

// ─── Subject helpers ─────────────────────────────────────────────────────────

/** Whitelist used by API + UI. Matches the CHECK constraint on the table. */
export function isTaskSubject(s: string | null | undefined): s is TaskSubject {
  return s === "matematik" || s === "dansk" || s === "engelsk" || s === "tysk"
}

/** Group open tasks by subject. Used by the Tavle component. */
export function groupBySubject(tasks: TaskRow[]): Record<TaskSubject, TaskRow[]> {
  const out: Record<TaskSubject, TaskRow[]> = {
    matematik: [],
    dansk: [],
    engelsk: [],
    tysk: [],
  }
  for (const t of tasks) out[t.subject].push(t)
  return out
}

/** Find the open (non-completed) session for this task, if one exists. */
export async function findOpenSessionForTask(
  parentId: string,
  taskId: string,
): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("sessions")
    .select("id")
    .eq("task_id", taskId)
    .eq("parent_id", parentId)
    .eq("completed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}
