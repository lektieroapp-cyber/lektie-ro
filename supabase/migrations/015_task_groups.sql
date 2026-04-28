-- LektieRo 015: task groups — multi-task submissions stay together.
--
-- A task group = the set of tasks extracted from one homework photo (or one
-- parent submission). Pre-015 every task was an island, so a kid finishing
-- one parent-submitted task got dumped back to the empty board. With a
-- group_id we can offer "next opgave i denne sæt" mirroring the
-- kid-takes-photo flow (SessionFlow.nextTask).
--
-- Nullable + no FK to a separate groups table on purpose: the group is just
-- a shared uuid stamped at creation time. Keeping it as a bare uuid means
-- no extra round-trip / extra row, and dismissed siblings simply never
-- inherit the id. If we ever want a real groups table (cover photo, parent
-- note, batch metadata), we can add it later and back-fill from this column.

alter table public.tasks
  add column if not exists task_group_id uuid;

-- Sibling lookup: given a task, find the rest of its group for the kid's
-- board. Filter on (group, child, status, approved) so the next-task query
-- hits a single index.
create index if not exists tasks_group_idx
  on public.tasks(task_group_id, child_id, status)
  where task_group_id is not null;
