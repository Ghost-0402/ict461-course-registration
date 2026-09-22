# AI-use.md

## Task 1 — Accessible interface

**Prompt used:** Asked Claude to build a full accessible, responsive course
registration interface (HTML/CSS/JS) meeting the lab's semantic HTML,
keyboard-accessibility, and localStorage requirements.

**Suggestion given:** Complete index.html/styles.css/app.js/api.js with
semantic landmarks, a Flexbox/Grid responsive layout, a Fetch-based module
for API calls, and localStorage persistence for the programme preference.

**Used/rejected:** Used as given, then tested it myself.

**What I tested:** Tabbed through the whole form keyboard-only (confirmed
the gold focus ring), checked the 360px and 1366px layouts in DevTools,
reloaded to confirm the programme preference persisted, and submitted a
duplicate registration to confirm server-side rejection surfaced correctly.

**What I learned:** focus-visible styling only shows for keyboard
navigation, not mouse clicks — I had to actually Tab to a field, not click
it, to see the gold ring. Also learned the difference between client-side
validation (fast feedback, easily bypassed) and server-side validation
(the real enforcement).

---

## Task 2 — HTTP contract

**Prompt used:** Asked Claude to build the Express API with all six routes
and correct status codes, then guided me through testing each one with
cURL and the DevTools Network tab.

**Suggestion given:** server.js implementing the six routes plus /inspect,
and step-by-step cURL commands for each success/failure case.

**Used/rejected:** Used as given.

**What I tested:** Every route's success and failure paths via cURL
(200/201/400/404/409/204), then repeated key ones through the actual
browser form while watching the Network tab, and used "Copy as cURL" to
reproduce a request outside the browser.

**What I learned:** Idempotency is about the effect on server state
staying the same, not the status code repeating — a second DELETE on the
same ID correctly returns 404 even though the first one deleted
successfully. Also learned Content-Type and Accept are independent
headers (what you send vs. what you'll accept back).

---

## Task 3 — Caching and CORS

**Prompt used:** Asked Claude to help me test ETag/304 revalidation and
deliberately reproduce a CORS failure.

**Suggestion given:** curl commands using If-None-Match, instructions to
add a course and restart to see the ETag change, and steps to comment out
the CORS middleware to observe the failure before restoring it.

**Used/rejected:** Used as given.

**What I tested:** Confirmed unchanged data returns 304 with no body;
confirmed changed data returns a new ETag and fresh 200; commented out
CORS and watched the Console error and Network headers; restored it and
confirmed it worked again.

**What I learned:** CORS is enforced by the browser, not the server — the
server responded 200 OK the whole time even when CORS was broken. The
browser just refused to expose that response to my JavaScript without the
Access-Control-Allow-Origin header.

---

## Task 4 — State, security, performance

**Prompt used:** Asked Claude to help trigger and inspect the demo cookie,
compare security headers on Moodle vs. GitHub, and measure a performance
improvement.

**Suggestion given:** A fetch() call from the Console to trigger the
cookie route, guidance on which DevTools tabs to check, and the specific
change of merging api.js into app.js to cut one HTTP request.

**Used/rejected:** Used as given.

**What I tested:** Confirmed HttpOnly/SameSite=Lax on the cookie and that
it got resent automatically on a later request; compared security headers
between Moodle (missing all four) and GitHub (had all four, including a
genuine HTTP/3 response); measured load time before (976ms) and after
(880ms) merging the two JS files under Fast 4G throttling.

**What I learned:** A missing security header doesn't prove a
vulnerability by itself — it just means that response didn't set it.
Also learned HTTP/2 multiplexes many requests over one connection
(visible as near-0ms gaps between GitHub's asset requests), while HTTP/3
runs over QUIC/UDP instead of TCP.

---

## Checkpoint B — predict/actual log

| # | Experiment | My prediction | Actual result | Explanation |
|---|---|---|---|---|
| 1 | 'GET /api/courses' with a matching If-None-Match | Server would confirm nothing changed without resending the data | '304 Not Modified', no body | Server compares ETags; matching means the cached copy is still valid |
| 2 | Added a course, restarted, re-requested | ETag (fingerprint) would be different since the data changed, so fresh data would come back | New ETag, fresh 200, 6 courses returned | ETags are content hashes — any real change produces a different hash |
| 3 | Commented out CORS middleware, submitted form | Expected the server itself to fail or refuse the request | Server responded '200 OK'; browser Console blocked it with a CORS policy error | CORS is enforced by the browser, not the server — the response arrived fine, but JavaScript wasn't allowed to read it without the Access-Control-Allow-Origin header |
| 4 | Restored CORS middleware, retried | Expected everything to go back to working normally, no other changes needed | Course dropdown loaded correctly, no error | Confirms the missing header was the sole cause |

**Note on pairing:** I ran this session solo. My partner will go through
the repo, the DevTools evidence, and this Checkpoint B log separately, and
we'll cover the "swap keyboard roles" step and add their own explanation
of a failed request together before submission.

**Failed request explanation (CORS):** For Task 3.2 I commented out the
CORS middleware in server.js and tried submitting the form again from the
browser. It broke straight away — the course dropdown just sat there
saying "Loading courses…" and the Console threw a CORS error: "blocked by
CORS policy: No 'Access-Control-Allow-Origin' header is present." What
actually surprised me was checking the Network tab, because the request
itself showed 200 OK. The server had processed it fine and sent back the
full course list — it wasn't a server-side failure at all. The browser was
the one blocking it, refusing to hand that response over to my JavaScript
because the server hadn't said http://localhost:5500 was allowed to read
it. Fixing it was easy once I understood that: I uncommented the CORS
middleware, restarted the API, reloaded the page, and it worked
immediately. That confirmed the missing header really was the only thing
wrong — nothing else needed touching.

---

## Individual reflection (100 words)

**Dennis —** I built and tested the full course registration portal
end-to-end — the accessible interface, all six API routes, caching/CORS,
and cookie/security behavior — verifying each piece with cURL, DevTools
Network captures, and browser testing rather than just trusting the code
worked. One mistake I made was running `git add -A` early in the process,
which accidentally bundled documentation files into a commit meant only
for API changes. I caught this by checking `git log --stat` and noticing
files that didn't match the commit message, then fixed it with
`git commit --amend` instead of rewriting further history.

**Partner —** *(to be added)*