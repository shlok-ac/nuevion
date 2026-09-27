/**
 * Minimal API client for the citizen portal.
 *
 * The complaint form posts to the SentinCash API so the filing lands in SQLite and
 * immediately provisions a case + alert on the command center. The base URL is
 * overridable at build time; the default targets the local dev server.
 */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:5000";

/**
 * Files a complaint. Returns the server-issued complaint number and case reference.
 * @param {object} complaint
 * @returns {Promise<{complaintNumber: string, caseNumber: string, priority: string}>}
 */
export async function submitComplaint(complaint) {
  const response = await fetch(`${API_BASE}/api/v1/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(complaint),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Could not submit the complaint");
  }
  return payload;
}

/** Traces a previously filed complaint by its number. */
export async function trackComplaint(complaintNumber) {
  const response = await fetch(
    `${API_BASE}/api/v1/complaints/${encodeURIComponent(complaintNumber)}`,
  );
  if (!response.ok) return null;
  return response.json();
}

export { API_BASE };
