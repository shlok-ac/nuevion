const API_ROOT = "/api/v1";

async function readResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || `Request failed (${response.status}).`);
    error.stage = body.stage;
    throw error;
  }
  return body;
}

export async function analyzeComplaintAudio(audioFile, sourceLanguage) {
  const formData = new FormData();
  formData.append("audio", audioFile);
  formData.append("sourceLanguage", sourceLanguage);

  const response = await fetch(`${API_ROOT}/triage-voice`, {
    method: "POST",
    body: formData,
  });
  return readResponse(response);
}

export async function registerTriageComplaint(complaint) {
  const response = await fetch(`${API_ROOT}/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      complaintNumber: complaint.complaint_id,
      complainantName: "Helpline caller",
      fraudAmount: complaint.stolen_amount_inr || 0,
      transactionType: complaint.transfer_mode || "UPI",
      fraudDate: complaint.incident_date || new Date().toISOString().slice(0, 10),
      fraudTime: complaint.incident_time || new Date().toISOString().slice(11, 19),
      location: complaint.incident_place || "",
      accountNumber: complaint.initial_mule_account || "",
      description: complaint.english_transcript || "",
      source: "BHASHINI_VOICE",
    }),
  });
  return readResponse(response);
}

export async function refreshInvestigationData() {
  const response = await fetch(`${API_ROOT}/sync`, { method: "POST" });
  return readResponse(response);
}
