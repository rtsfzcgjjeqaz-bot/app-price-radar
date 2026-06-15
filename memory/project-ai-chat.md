---
name: project-ai-chat
description: AI chat endpoint architecture — provider, context injection, fallback, locale switching
metadata:
  type: project
---

Chat endpoint: `app/api/chat/route.ts` — rate-limited (20 req/IP/60s), locale-aware (EN/ZH).
AI provider: OpenAI `gpt-4o-mini` via `lib/chat.ts`. `@anthropic-ai/sdk` installed but unused.
Context injection: `lib/db/chat-context.ts` — fetches all default-plan (plan_id IS NULL) prices, builds per-app comparative analysis blocks. Fixed 2026-06-05: was incorrectly filtering `.not('plan_id','is',null)` (got zero rows). Now uses `.is('plan_id', null)`.
Fallback: `lib/db/fallback.ts` — keyword-matching on mock data. Only triggers in production on OpenAI error. Uses mock prices, not live DB.
Locale: `body.locale` passed as `'en'|'zh'`, appended to system prompt as a language instruction.

**Why:** `getChatContext` bug meant the AI had no price data injected — all responses were hallucinated. Fixed by correcting the Supabase filter.

**How to apply:** If AI responses look generic or hallucinated, first check whether getChatContext is returning data (add a dev log or hit `/api/db-health`). [[project-state]]
