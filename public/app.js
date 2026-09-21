// app.js — combined with api.js's Fetch helper to cut one HTTP request.

const API_BASE = "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      if (data && data.error) message = data.error;
      if (data && data.errors) message = data.errors.join(" ");
    } catch {
      /* body wasn't JSON — ignore and use statusText */
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function fetchCourses() {
  return request("/api/courses");
}

function fetchRegistration(id) {
  return request(`/api/registrations/${encodeURIComponent(id)}`);
}

function createRegistration(data) {
  return request("/api/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

const form = document.getElementById("registration-form");
const feedback = document.getElementById("feedback");
const submitBtn = document.getElementById("submit-btn");
const courseSelect = document.getElementById("course");
const programmeSelect = document.getElementById("programme");

const lookupBtn = document.getElementById("lookup-btn");
const lookupInput = document.getElementById("lookup-id");
const lookupResult = document.getElementById("lookup-result");

const PROGRAMME_STORAGE_KEY = "preferredProgramme";

// ---------------------------------------------------------------------
// Restore the last-chosen programme from localStorage (persists across
// reloads and browser restarts, until explicitly cleared).
// ---------------------------------------------------------------------
function restoreProgrammePreference() {
  const saved = localStorage.getItem(PROGRAMME_STORAGE_KEY);
  if (saved) {
    programmeSelect.value = saved;
  }
}

programmeSelect.addEventListener("change", () => {
  localStorage.setItem(PROGRAMME_STORAGE_KEY, programmeSelect.value);
});

// ---------------------------------------------------------------------
// Populate the course dropdown from the API
// ---------------------------------------------------------------------
async function loadCourses() {
  try {
    const courses = await fetchCourses();
    courseSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = "Select a course";
    courseSelect.appendChild(placeholder);

    for (const course of courses) {
      const option = document.createElement("option");
      option.value = course.code;
      option.textContent = `${course.code} — ${course.title}`;
      courseSelect.appendChild(option);
    }
  } catch (err) {
    setFeedback(`Could not load courses: ${err.message}`, "error");
  }
}

// ---------------------------------------------------------------------
// Feedback region helper — updates the DOM safely via textContent
// (never innerHTML with unsanitised user input).
// ---------------------------------------------------------------------
function setFeedback(message, state) {
  feedback.textContent = message;
  feedback.className = state || "";
}

function clientSideValidate(data) {
  const errors = [];
  if (!data.name.trim()) errors.push("Name is required.");
  if (!data.studentId.trim()) errors.push("Student ID is required.");
  if (!data.programme) errors.push("Programme is required.");
  if (!data.course) errors.push("Course is required.");
  return errors;
}

// ---------------------------------------------------------------------
// Submit handler
// ---------------------------------------------------------------------
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    studentId: document.getElementById("studentId").value,
    programme: programmeSelect.value,
    course: courseSelect.value,
  };

  const clientErrors = clientSideValidate(data);
  if (clientErrors.length > 0) {
    setFeedback(clientErrors.join(" "), "error");
    return;
  }

  submitBtn.disabled = true;
  setFeedback("Submitting…", "loading");

  try {
    const record = await createRegistration(data);
    setFeedback(
      `Registered! Confirmation ID: ${record.id}. Server-side validation and duplicate checks passed.`,
      "success"
    );
    form.reset();
    restoreProgrammePreference(); // keep the saved preference after reset
  } catch (err) {
    // Server-side validation / duplicate errors surface here even if a
    // user bypasses the client-side checks above.
    setFeedback(`Registration failed: ${err.message}`, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------------------------------------------------------------------
// Lookup handler
// ---------------------------------------------------------------------
lookupBtn.addEventListener("click", async () => {
  const id = lookupInput.value.trim();
  if (!id) {
    lookupResult.textContent = "Enter a registration ID first.";
    lookupResult.className = "error";
    return;
  }

  lookupResult.textContent = "Looking up…";
  lookupResult.className = "loading";

  try {
    const record = await fetchRegistration(id);
    lookupResult.textContent = `#${record.id}: ${record.name} (${record.studentId}) — ${record.programme}, ${record.course}`;
    lookupResult.className = "success";
  } catch (err) {
    lookupResult.textContent = `Lookup failed: ${err.message}`;
    lookupResult.className = "error";
  }
});

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
restoreProgrammePreference();
loadCourses();
