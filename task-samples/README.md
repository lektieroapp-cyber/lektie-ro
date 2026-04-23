# Task samples — test material for the vision pipeline

Drop zip files of homework photos here when you want to test the
`/api/solve` vision extraction against real material. This folder is
git-ignored — nothing in it gets committed or deployed.

## What to put here

- **Zips of homework images** from a single book, grade, or subject:
  `matematik-3kl-2026-04.zip`, `engelsk-warmup-pages.zip`, etc.
- Individual unzipped images are fine too (the `.gitignore` below catches all).
- Optionally: notes about what the AI got right/wrong per batch.

## Suggested naming

```
task-samples/
├── matematik-3kl/
│   ├── page-15.jpg
│   ├── page-16.jpg
│   └── notes.md           ← "page 16 extracts 6 groups instead of 2"
├── engelsk-warmup/
│   └── warmup-1.jpg
└── dansk-stavning.zip
```

## Why it's git-ignored

Homework photos are PII under GDPR — real kid handwriting, sometimes names
on the page. We do NOT commit them. The folder is personal to whoever's
running the test; the `.gitignore` at the root already excludes everything
except this README.

## How to test a sample against the flow

1. Unzip the file (or use it as-is if it's a single image)
2. Log in as admin → `/da/parent/dashboard` → drop the image
3. Session runs through `/api/solve` with live Azure
4. Inspect the task picker result + the conversation that follows
5. Copy the dev-log transcript via **"Kopiér log"** in the top-right panel
6. Save any interesting findings back here as notes

For pre-captured images in the bucket, `/da/admin/test-images` lets you
re-run an existing session's photo without re-uploading.
