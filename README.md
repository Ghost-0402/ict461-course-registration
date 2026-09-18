# ICT461 Lab — Course Registration Portal

Mulungushi University · School of Engineering and Technology · Department of
Computer Science and IT — Web standards and HTTP fundamentals.

## Run instructions

Requires Node.js and npm.

```bash
npm install
```

**API** (in one terminal), served at `http://localhost:3000`:

```bash
npm start
```

**Interface** (in a second terminal), served at `http://localhost:5500`:

```bash
npm run serve
```

Open `http://localhost:5500` in the browser. The interface calls the API at
`http://localhost:3000`, so both must be running — on different ports, which
is what makes this a cross-origin (CORS) setup in Task 3.2.

Data is **in-memory only**: registrations are lost on every server restart.
There is no database and no real authentication, by design (out of scope for
this lab).

## Project structure

```
server.js          Express API (port 3000)
public/
  index.html        Semantic, accessible registration interface
  styles.css         Flexbox/Grid layout, responsive from 360px to 1366px+
  api.js              Fetch helper module (imported by app.js)
  app.js               Event handling, DOM updates, localStorage
package.json
AI-use.md           AI usage log (fill in per attempt — see note below)
decision-note.md    Short design decisions writeup
```

## API contract

Base URL: `http://localhost:3000`

| Method | Route | Body | Success | Failure modes |
|---|---|---|---|---|
| GET | `/api/courses` | — | `200` JSON array of courses. `ETag` + `Cache-Control: public, max-age=60`; `If-None-Match` match → `304` (no body) | *(read-only, static list — no auth/validation failure modeled)* |
| GET | `/api/registrations/:id` | — | `200` JSON record | `404` unknown ID |
| POST | `/api/registrations` | `{ name, studentId, programme, course }` | `201` + `Location: /api/registrations/:id`, JSON record | `400` missing/invalid field; `409` duplicate `studentId` + `course` |
| PUT | `/api/registrations/:id` | Full record (all 4 fields) | `200` JSON updated record | `400` missing/invalid field; `404` unknown ID; `409` would create a duplicate |
| PATCH | `/api/registrations/:id` | `{ programme }` only | `200` JSON updated record | `400` invalid programme value; `404` unknown ID |
| DELETE | `/api/registrations/:id` | — | `204` No Content (no body) | `404` unknown ID |

Diagnostic route (not part of the core contract):

| Method | Route | Purpose |
|---|---|---|
| ALL | `/inspect` | Echoes method, path, query, headers and parsed body — used to compare `Accept` vs `Content-Type` and to confirm form vs JSON parsing. |
| GET | `/api/demo-cookie` | Sets a non-sensitive demo cookie (`HttpOnly`, `SameSite=Lax`, `Path=/`). Demonstration only — not a login system. |

### Idempotency note

Repeating **PUT** or **DELETE** with the same inputs leaves the *server
state* the same after the second call as after the first (the record ends
up in the same shape, or stays deleted) — that is what idempotency means.
It does **not** mean the *status codes* repeat: a second `DELETE` on the
same ID returns `404` (already gone), and a second identical `POST`
correctly returns `409` rather than creating a duplicate, because POST was
never idempotent to begin with. Idempotency is about the intended effect on
the resource, not about the HTTP response being byte-identical every time.

### Caching (Task 3.1)

`GET /api/courses` is cacheable (`Cache-Control: public, max-age=60`) since
the course list changes rarely. It also carries an `ETag`; a client that
sends `If-None-Match` with a still-current tag gets `304 Not Modified` with
no body (**freshness** — no request even needed within max-age; **
revalidation** — a conditional request confirms the cached copy is still
good after max-age expires). Registration endpoints are all tagged
`Cache-Control: no-store` because they return per-user, mutable state that
must never be served stale from a cache.

### CORS (Task 3.2)

The API allows only `http://localhost:5500` as an origin, with `GET, POST,
PUT, PATCH, DELETE, OPTIONS` and the `Content-Type` header, plus
`credentials: true` (needed so the browser will send/store the demo
cookie). Comment out the `app.use(cors(...))` block in `server.js` to
reproduce the blocked-by-CORS failure and the browser's automatic `OPTIONS`
preflight request, then restore it to see the same request succeed.

### Cookies and security (Task 4)

- `HttpOnly` stops client-side JavaScript from reading the cookie via
  `document.cookie`, which limits the damage an XSS bug could do.
- `SameSite=Lax` stops the cookie being sent on most cross-site requests
  (e.g. an `<img>` or a cross-site POST from another page), which blocks a
  large class of CSRF attacks — but not all of them (a same-site GET-based
  attack, or a Lax-permitted top-level navigation, can still slip through),
  so `SameSite` is a mitigation, not a replacement for CSRF tokens.
- `Secure` is required in production so the cookie is only ever sent over
  HTTPS, never in plaintext over HTTP.
- **Cookie sessions vs bearer tokens:** a cookie is attached to requests
  automatically by the browser (convenient, but that's exactly what makes
  CSRF possible); a bearer token (e.g. a JWT in an `Authorization` header)
  has to be attached deliberately by JavaScript, which avoids CSRF but
  reintroduces the XSS-can-steal-it risk if it's kept somewhere JS can read
  it, and requires the client to manage storage/refresh itself.

### HTTP/2, HTTP/3, and waterfalls (Task 4.3)

**HTTP/2 multiplexing** lets many requests and responses share a single TCP
connection concurrently, interleaved as frames, instead of one at a time or
requiring many parallel connections — this removes head-of-line blocking at
the *HTTP* layer. **HTTP/3** runs over **QUIC**, which itself runs over
**UDP** rather than TCP; this removes head-of-line blocking at the
*transport* layer too, because one lost packet no longer stalls every
stream on the connection, only the stream it belonged to.

> Report the protocol actually shown in DevTools' Protocol column for the
> HTTPS site you inspect. Do not claim HTTP/3 unless it is genuinely what
> was observed.

## A note on AI-use.md and the reflections

`AI-use.md` and the individual 100-word reflections the lab asks for are meant
to record what *you* actually tried, tested and learned — including your
first, pre-AI attempt at the Checkpoint A sketch and any failed requests
from Checkpoint B. I can't truthfully fill those in for you since they're
about your own process; `AI-use.md` here is left as a template with the
required structure for you to complete honestly. The Checkpoint A sketch
(browser → web server → application → data store, with validation placement)
and the Checkpoint B predict/observe/explain log are also yours to do by
hand per the brief's "before AI assistance" instruction.
