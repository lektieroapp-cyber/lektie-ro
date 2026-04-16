# Forældre Ro — Insights & Subject Approaches

Plan for the parent-facing analytics and per-subject pedagogical logic.

---

## Data we already collect per session

| Field | Source | Notes |
|-------|--------|-------|
| `child_id` | session create | which child |
| `subject` | `/api/solve` (Stage 1) | matematik, dansk, engelsk |
| `grade` | `/api/solve` | detected or child profile |
| `problem_type` | `/api/solve` | e.g. "multiplication", "reading", "grammar" |
| `problem_text` | `/api/solve` | the actual task text |
| `mode` | user pick | "explain" or "hint" |
| `turn_count` | session complete | total messages |
| `difficulty_score` | derived (1–5) | 1=quick, 5=gave up |
| `completed` | session complete | did they finish? |
| `started_at` / `ended_at` | auto | duration |
| `turns` | turns table | full conversation history |

---

## Subject-specific approaches

Each subject needs a different pedagogical strategy. The curriculum files (`lib/curriculum/`) already handle grade-level concepts, but the AI approach itself should differ.

### Matematik
- Visual/concrete: draw it, count on fingers, use objects
- Step-by-step decomposition: break the problem into smaller operations
- Pattern recognition: "What do you notice about these numbers?"
- Problem types: addition, subtraction, multiplication, division, fractions, geometry, word problems
- Word problems are hardest — separate "understanding the question" from "doing the math"

### Dansk
- Reading: phonics for young kids, comprehension questions for older
- Writing: structure (intro/body/conclusion), spelling, grammar
- Oral: retelling, vocabulary building
- Ordblindhed (dyslexia) support: extra patience, sound-out words, never rush
- Problem types: reading comprehension, spelling, grammar, essay/composition, dictation

### Engelsk
- Vocabulary-first: translate concepts via Danish parallels
- Grammar: compare to Danish grammar where similar
- Reading: simpler texts, focus on understanding not perfect pronunciation
- Writing: sentence structure before complex composition
- Problem types: translation, grammar, vocabulary, reading, composition

### Future subjects (not in v1)
- Natur/teknik, historie, samfundsfag — add curriculum files when needed

---

## Parent insights — what Forældre Ro should show

### Per-child overview
- **Subject distribution** — pie/bar chart: how much time on each subject
- **Difficulty trend** — line chart over time: are they improving? (avg difficulty_score going down = good)
- **Completion rate** — % of sessions finished vs gave up
- **Session frequency** — how often they do homework through the app
- **Time per session** — average duration

### Strengths & weaknesses
- Aggregate `difficulty_score` by `subject` + `problem_type`
- Low avg difficulty = strength, high avg difficulty = weakness
- Show as simple cards: "Stærk i: addition, læseforståelse" / "Øv mere: brøker, grammatik"
- Update as more sessions complete — needs minimum 3 sessions per category to be meaningful

### Per-session parent summary (Louise point 7)
After each session, generate a short parent-facing summary:
- What subject/topic was covered
- How the child did (struggled, breezed through, needed explanation first)
- What the parent can ask about: "Ask Malthe about fractions — he learned that a half means splitting into two equal parts"
- Conversation starters so the parent can engage

**Implementation:** AI-generated via `buildCoachSystemPrompt()` feeding in the session turns. Store as `sessions.parent_summary` column. Generate on session complete (async, non-blocking).

### Learning guidelines (Louise point 6)
Based on accumulated session data, surface practical tips:
- "Malthe struggles most with word problems. Try reading the problem aloud together before he starts."
- "His reading sessions go much faster when the text is about animals — his interest data says he likes dogs."
- Refreshed periodically (weekly?) or when parent opens Forældre Ro

---

## Queries needed

```sql
-- Subject breakdown for a child
SELECT subject, COUNT(*) as sessions, AVG(difficulty_score) as avg_difficulty
FROM sessions WHERE child_id = ? AND completed = true
GROUP BY subject;

-- Problem type strengths/weaknesses
SELECT subject, problem_type, AVG(difficulty_score) as avg_difficulty, COUNT(*) as attempts
FROM sessions WHERE child_id = ? AND completed = true
GROUP BY subject, problem_type
HAVING COUNT(*) >= 3
ORDER BY avg_difficulty DESC;

-- Difficulty trend (last 20 sessions)
SELECT started_at::date as day, AVG(difficulty_score) as avg_difficulty
FROM sessions WHERE child_id = ? AND completed = true
GROUP BY day ORDER BY day DESC LIMIT 20;

-- Recent sessions for parent summary
SELECT id, subject, problem_text, problem_type, difficulty_score, turn_count, started_at
FROM sessions WHERE child_id = ? AND completed = true
ORDER BY started_at DESC LIMIT 10;
```

---

## API routes needed

| Route | Purpose |
|-------|---------|
| `GET /api/insights/[childId]` | Aggregated stats: subject breakdown, strengths/weaknesses, trends |
| `GET /api/insights/[childId]/sessions` | Recent sessions with parent summaries |
| `POST /api/insights/[childId]/summary` | Trigger AI-generated parent summary for a session |

---

## Schema additions (phase 2 migration)

```sql
-- Add to sessions table
ALTER TABLE sessions ADD COLUMN parent_summary TEXT;

-- Optional: materialized view for fast stats
-- (or just query directly — volume is low per child)
```

---

## Dependencies

- Sessions + turns tables must be created and populated (phase 2 schema)
- Azure OpenAI must be live (for AI-generated parent summaries)
- Forældre Ro page must be built out (currently a stub)

---

## Priority order

1. **Schema** — create sessions + turns tables, apply migrations
2. **Data collection** — already works via `/api/session` POST/PATCH
3. **Stats API** — `/api/insights/[childId]` with the aggregation queries
4. **Forældre Ro UI** — subject breakdown, strengths/weaknesses, trend chart
5. **Per-session summaries** — AI-generated, shown on recent sessions list
6. **Learning guidelines** — AI-generated periodic tips based on accumulated data
