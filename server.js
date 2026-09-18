/**
 * ICT461 Lab — Course Registration API
 * Serves at http://localhost:3000
 *
 * Implements:
 *  - GET    /api/courses
 *  - GET    /api/registrations/:id
 *  - POST   /api/registrations
 *  - PUT    /api/registrations/:id
 *  - PATCH  /api/registrations/:id
 *  - DELETE /api/registrations/:id
 *  - ALL    /inspect            (diagnostic route)
 *  - GET    /api/demo-cookie    (cookie demonstration, not a login system)
 *
 * In-memory data only — no database, no real authentication (per lab scope).
 */

const express = require("express");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const PORT = 3000;
const INTERFACE_ORIGIN = "http://localhost:5500";

// ---------------------------------------------------------------------------
// Body parsers — support both JSON and classic form submissions (Task 2.3)
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// CORS — allow only the interface origin, the methods we need, Content-Type,
// and credentials (needed for the cookie demo in Task 4). Task 3.2 asks you
// to first try WITHOUT this middleware to observe the failure + preflight,
// then re-enable it. Comment the app.use(cors(...)) line out to reproduce
// that failure, then restore it.
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: INTERFACE_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// In-memory "database"
// ---------------------------------------------------------------------------
const courses = [
  { code: "CS101", title: "Introduction to Programming" },
  { code: "IT201", title: "Web Systems and Technologies" },
  { code: "IT301", title: "Database Systems" },
  { code: "IT401", title: "Cloud Computing" },
  { code: "IT402", title: "Cybersecurity Fundamentals" },
];

let registrations = [];
let nextId = 1;

const PROGRAMMES = [
  "BSc Computer Science",
  "BSc Information Technology",
  "BSc Software Engineering",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeCoursesETag() {
  const hash = crypto.createHash("sha1").update(JSON.stringify(courses)).digest("hex");
  return `"${hash}"`;
}

function validateRegistrationPayload(body, { partial = false } = {}) {
  const errors = [];
  const required = ["name", "studentId", "programme", "course"];

  if (!partial) {
    for (const field of required) {
      if (!body || typeof body[field] !== "string" || body[field].trim() === "") {
        errors.push(`Field "${field}" is required.`);
      }
    }
  }

  if (body && body.programme !== undefined && !PROGRAMMES.includes(body.programme)) {
    errors.push(`"programme" must be one of: ${PROGRAMMES.join(", ")}`);
  }

  if (body && body.course !== undefined) {
    const known = courses.some((c) => c.code === body.course);
    if (!known) errors.push(`"course" must be a known course code.`);
  }

  return errors;
}

function findRegistration(id) {
  return registrations.find((r) => String(r.id) === String(id));
}

function isDuplicate(studentId, course, excludeId = null) {
  return registrations.some(
    (r) =>
      r.studentId === studentId &&
      r.course === course &&
      String(r.id) !== String(excludeId)
  );
}

// ---------------------------------------------------------------------------
// GET /api/courses — cached with ETag + max-age=60 (Task 3.1)
// ---------------------------------------------------------------------------
app.get("/api/courses", (req, res) => {
  const etag = computeCoursesETag();
  res.set("Cache-Control", "public, max-age=60");
  res.set("ETag", etag);

  const clientETag = req.headers["if-none-match"];
  if (clientETag && clientETag === etag) {
    return res.status(304).end(); // No body on a 304
  }

  res.status(200).json(courses);
});

// ---------------------------------------------------------------------------
// GET /api/registrations/:id
// ---------------------------------------------------------------------------
app.get("/api/registrations/:id", (req, res) => {
  res.set("Cache-Control", "no-store");
  const record = findRegistration(req.params.id);
  if (!record) {
    return res.status(404).json({ error: "Registration not found." });
  }
  res.status(200).json(record);
});

// ---------------------------------------------------------------------------
// POST /api/registrations — 201 + Location | 400 invalid | 409 duplicate
// ---------------------------------------------------------------------------
app.post("/api/registrations", (req, res) => {
  res.set("Cache-Control", "no-store");
  const errors = validateRegistrationPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const { name, studentId, programme, course } = req.body;

  if (isDuplicate(studentId, course)) {
    return res.status(409).json({
      error: `Student ${studentId} is already registered for ${course}.`,
    });
  }

  const record = { id: nextId++, name, studentId, programme, course };
  registrations.push(record);

  res
    .status(201)
    .set("Location", `/api/registrations/${record.id}`)
    .json(record);
});

// ---------------------------------------------------------------------------
// PUT /api/registrations/:id — full replace, validate every field
// ---------------------------------------------------------------------------
app.put("/api/registrations/:id", (req, res) => {
  res.set("Cache-Control", "no-store");
  const record = findRegistration(req.params.id);
  if (!record) {
    return res.status(404).json({ error: "Registration not found." });
  }

  const errors = validateRegistrationPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const { name, studentId, programme, course } = req.body;

  if (isDuplicate(studentId, course, record.id)) {
    return res.status(409).json({
      error: `Student ${studentId} is already registered for ${course}.`,
    });
  }

  record.name = name;
  record.studentId = studentId;
  record.programme = programme;
  record.course = course;

  res.status(200).json(record);
});

// ---------------------------------------------------------------------------
// PATCH /api/registrations/:id — programme only
// ---------------------------------------------------------------------------
app.patch("/api/registrations/:id", (req, res) => {
  res.set("Cache-Control", "no-store");
  const record = findRegistration(req.params.id);
  if (!record) {
    return res.status(404).json({ error: "Registration not found." });
  }

  if (
    !req.body ||
    typeof req.body.programme !== "string" ||
    !PROGRAMMES.includes(req.body.programme)
  ) {
    return res.status(400).json({
      errors: [`"programme" must be one of: ${PROGRAMMES.join(", ")}`],
    });
  }

  record.programme = req.body.programme;
  res.status(200).json(record);
});

// ---------------------------------------------------------------------------
// DELETE /api/registrations/:id — 204 no body | 404 unknown
// ---------------------------------------------------------------------------
app.delete("/api/registrations/:id", (req, res) => {
  res.set("Cache-Control", "no-store");
  const index = registrations.findIndex((r) => String(r.id) === String(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: "Registration not found." });
  }
  registrations.splice(index, 1);
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// /inspect — diagnostic route (Task 2.3)
// Echoes method, path, headers and body for both form and JSON submissions.
// ---------------------------------------------------------------------------
app.all("/inspect", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    body: req.body,
    accept: req.headers["accept"] || null,
    contentType: req.headers["content-type"] || null,
  });
});

// ---------------------------------------------------------------------------
// GET /api/demo-cookie — cookie demonstration only (Task 4.1)
// Not a login system. Non-sensitive value, HttpOnly, SameSite=Lax, Path=/.
// ---------------------------------------------------------------------------
app.get("/api/demo-cookie", (req, res) => {
  res.cookie("demo_pref", "dark-mode", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // secure: true, // enable when served over HTTPS in production
  });
  res.status(200).json({ message: "Demo cookie set. Check DevTools > Application > Cookies." });
});

app.listen(PORT, () => {
  console.log(`ICT461 API listening on http://localhost:${PORT}`);
});
