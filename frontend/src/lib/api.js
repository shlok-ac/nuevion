const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const getAuthToken = () => window.localStorage.getItem("cyberfraud_token");

const readResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (path, options = {}) => {
  const token = getAuthToken();
  const { headers: optionHeaders = {}, ...fetchOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...optionHeaders,
    },
  });

  const data = await readResponse(response);

  if (!response.ok) {
    const errorMessage =
      typeof data === "string"
        ? data
        : data?.message || "Request failed";
    throw new Error(errorMessage);
  }

  return data;
};

export const login = async ({ email, password }) => {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data?.token) {
    window.localStorage.setItem("cyberfraud_token", data.token);
    window.localStorage.setItem("cyberfraud_user", JSON.stringify(data.user || {}));
  }

  return data;
};

export const logout = () => {
  window.localStorage.removeItem("cyberfraud_token");
  window.localStorage.removeItem("cyberfraud_user");
};

export const getDashboardData = () => request("/api/dashboard");
export const getSystemHealth = () => request("/api/health");
export const getCase = (caseId) => request(`/api/cases/${encodeURIComponent(caseId)}`);
export const getAlerts = () => request("/api/alerts");
export const getFraudTrace = (complaintId) =>
  request(`/api/fraud/trace/${encodeURIComponent(complaintId)}`);

export const getATMs = () => request("/api/atms");
export const getPredictions = async () => {
  const rows = await request("/api/ml/predictions");
  return rows.map((row) => ({
    ...row,
    risk_level: String(row.atm_risk_inference?.risk_level || row.predicted_risk_level || row.risk_level || "").toUpperCase(),
    risk_level_source: row.atm_risk_inference ? "live_atm_risk_inference" : "imported_reference",
    risk_score: row.risk_score == null ? null : Number(row.risk_score),
    date: row.prediction_details?.date || "",
    time: row.prediction_details?.time || "",
    time_of_day: row.prediction_details?.time_of_day || "",
    crime_type: row.prediction_details?.crime_type || "",
  }));
};

export const saveMLPrediction = async (payload) => {
  return request("/api/ml/result", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
