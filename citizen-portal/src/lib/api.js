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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await readResponse(response);

  if (!response.ok) {
    const message = typeof data === "string" ? data : data?.message || "Request failed";
    throw new Error(message);
  }
  return data;
};

export const createComplaint = (complaint) =>
  request("/api/complaints", {
    method: "POST",
    body: JSON.stringify(complaint),
  });

export const getComplaintStatus = (complaintNumber, phoneNumber) =>
  request(
    `/api/complaints/${encodeURIComponent(complaintNumber)}/status?phone=${encodeURIComponent(phoneNumber)}`
  );
