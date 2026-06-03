# Security Notes — Private World Cup Dashboard

> **Scope**: This is a private/personal family project. Not a commercial or public-facing product.
> These notes document the defensive measures in place and their rationale.

---

## Access Control

| Mechanism | Status | Notes |
|-----------|--------|-------|
| Password gate | Disabled (intentional) | Family-sharing mode. Accessible via secret URL |
| Vercel Edge Middleware | Active | Clears legacy session cookies; redirects `/login` to `/` |
| Firestore Security Rules | Active | Field-level validation on all writable collections |
| Service role key in browser | None | Firebase client config only (public) — no admin credentials exposed |
| Environment variables in client JS | None | All secrets server-side only (GEMINI_API_KEY, etc.) |

---

## API Rate Limits (Edge Functions)

| Endpoint | Rate Limit | Window |
|----------|-----------|--------|
| `/api/analyst` | 12 requests | per 10 minutes per session/IP |
| `/api/pool-agent` | 8 requests | per 10 minutes per session/IP |
| `/api/pool-scan` | 6 requests | per 10 minutes per session/IP |

Rate keys are based on `wc_session` cookie (last 20 chars) or `x-forwarded-for` IP.

---

## File Upload Security (Analyst)

Server-side limits in `api/analyst.ts`:

- **Max size**: `~4MB` raw (5.6MB base64) — HTTP 413 if exceeded
- **Allowed MIME types**: `application/pdf`, `audio/webm`, `audio/ogg`, `audio/mp4`
- **No file persistence**: Uploads are base64 strings passed directly to Gemini in-memory — never stored on disk or Vercel storage
- **Question truncation**: `question` capped at 500 chars, `context` at 6,000 chars server-side

---

## Firestore Rules Summary

```
/poolPicks/{playerName}             → read: public | write: validated doc schema only
/poolGroups/{groupId}/members/{id}  → read: valid groupId | write: validated schema
/rtcSyncSessions/{code}             → read/write: 4-digit codes, validated fields
/flashChallenges/{challengeId}      → read: public | write: validated schema, no delete
```

All write operations enforce:
- `picks` map limited to 104 entries
- `playerName` / `avatarUrl` size limits
- Allowlisted field keys (no arbitrary data injection)
- No admin `delete` operations allowed from clients

---

## Known Non-Issues (Intentional Choices)

1. **Firebase config is public** — Firebase web config (apiKey, projectId) is designed to be public. Security is enforced by Firestore Rules, not by hiding the config.
2. **No auth** — Family-sharing pattern. Adding auth would block family members on different devices.
3. **Logo and branding assets** — Used under private/personal use. Not redistributed publicly.

---

## Recommendations Before Any Public Launch

If this project were ever made public:
- [ ] Re-enable password gate or add Firebase Auth
- [ ] Add `Content-Security-Policy` headers in `vercel.json`
- [ ] Audit Firestore rules to restrict reads to authenticated users
- [ ] Replace private/personal assets with licensed or generated alternatives
- [ ] Add `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` headers
