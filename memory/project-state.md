---
name: project-state
description: Current migration status, known env var gaps, and post-session state of App Price Radar
metadata:
  type: project
---

Migrations 009–013 are on disk but NOT applied to Supabase as of 2026-06-05.
Run them in order in the Supabase SQL Editor: 009 → 010 → 011 → 012 → 013.
After 009–012, run `npm run features:refresh` then `npm run training:backfill`.

**Why:** All migrations were written this session but no Supabase access was available to apply them.

**How to apply:** First question each new session: "Have the migrations been applied?" — if not, block on deployment before suggesting feature work.

Key env var gaps as of 2026-06-05:
- `OPENAI_API_KEY` — missing from `.env.local` and Vercel; without it the AI chat endpoint fails in production and falls back to mock data
- NOTE: `docs/CURRENT_SPRINT.md` incorrectly says `ANTHROPIC_API_KEY` — the code uses `openai`, not Anthropic SDK, for the chat endpoint. The `@anthropic-ai/sdk` is installed but unused in chat.

Migration 013 was added this session but was NOT listed in `CURRENT_SPRINT.md` (which only lists 009–012 as pending). Include 013 in any deployment checklist.
