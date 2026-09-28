const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const readResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (path, options = {}) => {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await readResponse(response);

  if (!response.ok) {
    const message = typeof data === "string" ? data : data?.message || "Request failed";
    const error = new Error(message);
    error.stage = typeof data === "object" ? data?.stage : undefined;
    throw error;
  }
  return data;
};

export const createComplaint = (complaint) =>
  request("/api/complaints", {
    method: "POST",
    body: JSON.stringify(complaint),
  });

export const analyzeComplaintAudio = (file, sourceLanguage = "auto") => {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("source_lang", sourceLanguage);
  return request("/api/complaints/triage-voice", {
    method: "POST",
    body: formData,
  });
};

export const getComplaintStatus = (complaintNumber, phoneNumber) =>
  request(
    `/api/complaints/${encodeURIComponent(complaintNumber)}/status?phone=${encodeURIComponent(phoneNumber)}`
  );
