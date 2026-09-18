# Decision note

**Layout:** CSS Grid on wider viewports (≥768px), plain flex/stack below
that, chosen because the registration form and lookup panel are naturally
two independent, equal-weight blocks once there's room, but need to stack
on a phone.

**Validation split:** Client-side checks (`clientSideValidate` in `app.js`)
exist only to give fast, friendly feedback and are not trusted. All real
enforcement — required fields, known programme/course values, and the
duplicate `studentId` + `course` check — happens server-side in
`server.js`, because a client-side-only check is trivially bypassed with
cURL or DevTools (demonstrated directly in Task 2.2).

**Storage choice:** `localStorage` for the programme preference (Task 1.3)
because it should survive reloads and new sessions; `sessionStorage` was
not used here since it clears per-tab and per-session, which would lose the
preference on every new visit — the opposite of what's wanted.

**Caching:** ETag + `max-age=60` on `GET /api/courses` only, since it's the
one endpoint whose data is shared, slow-changing, and safe to serve stale
for up to a minute. Every registration-related response is `no-store`
because it's per-user, mutable, and must never be reused from a cache.

**CORS scope:** origin locked to `http://localhost:5500` specifically
(not `*`), with `credentials: true`, since the cookie demo (Task 4.1)
requires the browser to actually store and resend the cookie, which
`Access-Control-Allow-Origin: *` cannot support alongside credentials.
