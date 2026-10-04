import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  analyzeComplaintAudio,
  refreshInvestigationData,
  registerTriageComplaint,
} from "@/lib/api";

const processingStages = [
  "Audio Uploaded",
  "Audio Processing",
  "BHASHINI Speech-to-Text",
  "Language Detection",
  "English Translation",
  "NLP Structuring",
  "Complaint Ready",
];

export default function VoiceTriagePage() {
  const navigate = useNavigate();
  const [audioFile, setAudioFile] = useState(null);
  const [sourceLang, setSourceLang] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [processingResult, setProcessingResult] = useState(null);

  // Form state auto-populated by the NLP engine
  const [formData, setFormData] = useState({
    complaint_id: "",
    incident_date: "",
    incident_time: "",
    incident_place: "",
    stolen_amount_inr: "",
    transfer_mode: "",
    initial_mule_account: "",
    scam_category: "FINANCIAL_FRAUD",
    english_transcript: "",
  });

  const pipelineState = useMemo(() => {
    if (loading) {
      return "Processing";
    }
    if (formData.english_transcript || formData.complaint_id || formData.initial_mule_account) {
      return "Completed";
    }
    return "Pending";
  }, [audioFile, loading, formData]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleProcessAudio = async () => {
    if (!audioFile) {
      setError("Please select an audio file to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setProcessingResult(null);

    try {
      const result = await analyzeComplaintAudio(audioFile, sourceLang);
      const payload = result || {};

      if (payload.status !== "success") {
        const message =
          typeof payload === "string"
            ? payload
            : payload?.message || "Audio processing failed.";
        setError(message);
        return;
      }

      const data = payload.structured_complaint || payload.complaint || {};
      if (!data || Object.keys(data).length === 0) {
        setError("Audio analysis did not return a structured complaint result.");
        return;
      }

      setProcessingResult(payload);
      setFormData({
        complaint_id: data.complaint_id || payload.complaint_id || "",
        incident_date: data.incident_date || "",
        incident_time: data.incident_time || "",
        incident_place: data.incident_place || "",
        stolen_amount_inr: data.stolen_amount_inr || "",
        transfer_mode: data.transfer_mode || "",
        initial_mule_account: data.initial_mule_account || "",
        scam_category: data.scam_category || payload.scam_category || "FINANCIAL_FRAUD",
        english_transcript: data.english_transcript || payload.transcript || "",
      });
    } catch (err) {
      const stage = err?.stage ? `${err.stage}: ` : "";
      setError(`${stage}${err?.message || "Audio processing failed."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProceedToMuleTrace = async () => {
    setSaving(true);
    setError(null);
    try {
      const createdCase = await registerTriageComplaint(formData);
      const targetCaseId = createdCase.caseNumber || createdCase.caseId;
      if (!targetCaseId) {
        throw new Error("Complaint was saved but the case identifier was not returned.");
      }

      try {
        await refreshInvestigationData();
      } catch (syncError) {
        throw new Error(`Case ${targetCaseId} was created, but dashboard data refresh failed: ${syncError.message}`);
      }
      navigate(`/cases/${targetCaseId}`, {
        state: {
          caseId: targetCaseId,
          complaint: formData,
          prefillComplaint: formData,
          autoRunTrace: true,
        },
      });
      window.setTimeout(() => window.location.reload(), 50);
    } catch (err) {
      setError(err?.message || "Complaint and case registration failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
<div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
  <div className="font-semibold">BHASHINI feature not deployed yet</div>
  <div className="mt-1 text-sm">
    Voice triage is part of the full integration, but its backend service is not included in this public demo deployment yet.
    The rest of the command centre works normally.
  </div>
</div>

      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Bhashini</h1>
        <p className="text-sm text-gray-500">
          Voice-based multilingual cybercrime complaint processing. This page uses the existing BHASHINI and NLP pipeline to convert real complaint audio into structured case details.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">1. Audio Upload</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select complaint audio (.mp3, .wav)</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {audioFile && (
              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <div><span className="font-semibold">Filename:</span> {audioFile.name}</div>
                <div><span className="font-semibold">Size:</span> {(audioFile.size / 1024 / 1024).toFixed(2)} MB</div>
                <div><span className="font-semibold">Type:</span> {audioFile.type || "audio"}</div>
                <div><span className="font-semibold">Upload status:</span> {audioFile ? "Ready" : "Pending"}</div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indic Language Channel</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="auto">Auto-Detect Language</option>
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="mr">Marathi (मराठी)</option>
              <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="bn">Bengali (বাংলা)</option>
              <option value="gu">Gujarati (ગુજરાતી)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleProcessAudio}
          disabled={loading || !audioFile}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-md disabled:bg-gray-400 transition"
        >
          {loading ? "Processing..." : "Process Audio"}
        </button>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Processing pipeline</p>
          <div className="flex flex-wrap gap-2">
            {processingStages.map((stage) => {
              const isActive = stage === "Audio Uploaded" ? Boolean(audioFile) : loading;
              const isDone = stage === "Complaint Ready" ? pipelineState === "Completed" : false;
              const isCurrent = stage === "Audio Processing" && loading;
              return (
                <div
                  key={stage}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                    isDone || isCurrent ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                    isActive ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {stage}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-600">Status: <span className="font-semibold">{pipelineState}</span></p>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
      </div>

      {processingResult && (
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          {processingResult.mode === "whisper_fallback" && (
            <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              Whisper fallback — this audio was not processed by live Bhashini.
            </p>
          )}
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Regional-language transcript</h2>
            <p className="mt-1 text-sm text-gray-700">{processingResult.transcript}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">English translation</h2>
            <p className="mt-1 text-sm text-gray-700">{processingResult.translated_text}</p>
          </div>
        </div>
      )}

      {formData.english_transcript && (
        <div className="bg-gray-50 border rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">English Transcript for NLP</h3>
          <p className="text-gray-800 italic text-sm font-mono">"{formData.english_transcript}"</p>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">2. Auto-Extracted Incident Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Complaint Reference</label>
            <input
              type="text"
              name="complaint_id"
              value={formData.complaint_id}
              onChange={handleInputChange}
              className="w-full border rounded p-2 text-sm bg-gray-50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Stolen Amount (INR)</label>
            <input
              type="text"
              name="stolen_amount_inr"
              value={formData.stolen_amount_inr}
              onChange={handleInputChange}
              className="w-full border rounded p-2 text-sm font-semibold text-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Initial Mule Account / VPA</label>
            <input
              type="text"
              name="initial_mule_account"
              value={formData.initial_mule_account}
              onChange={handleInputChange}
              className="w-full border rounded p-2 text-sm font-semibold text-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Incident Date</label>
            <input
              type="text"
              name="incident_date"
              value={formData.incident_date}
              onChange={handleInputChange}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Incident Time</label>
            <input
              type="text"
              name="incident_time"
              value={formData.incident_time}
              onChange={handleInputChange}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Jurisdiction / Location</label>
            <input
              type="text"
              name="incident_place"
              value={formData.incident_place}
              onChange={handleInputChange}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          {/* Code 2: Detected Scam Category Card */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Detected Scam Category</label>
            <select
              name="scam_category"
              value={formData.scam_category || "FINANCIAL_FRAUD"}
              onChange={handleInputChange}
              className="w-full border rounded p-2 text-sm font-semibold text-amber-700 bg-amber-50/40 border-amber-200 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="CREDIT_CARD_FRAUD">Credit Card / Banking Fraud</option>
              <option value="DIGITAL_ARREST">Digital Arrest / Law Enforcement Impersonation</option>
              <option value="UTILITY_BILL_FRAUD">Electricity / Utility Bill Fraud</option>
              <option value="TASK_JOB_FRAUD">Task / Telegram Job Fraud</option>
              <option value="INVESTMENT_TRADING_FRAUD">Crypto / Stock Investment Scam</option>
              <option value="LOAN_APP_EXTORTION">Loan App Harassment</option>
              <option value="COURIER_CUSTOMS_FRAUD">FedEx / Courier Narcotics Scam</option>
              <option value="KYC_SIM_EXPIRY_FRAUD">KYC / SIM Expiry Fraud</option>
              <option value="LOTTERY_REWARD_FRAUD">Lottery / Cashback Reward Fraud</option>
              <option value="REMOTE_ACCESS_MALWARE">Remote Access (AnyDesk/TeamViewer)</option>
              <option value="FINANCIAL_FRAUD">General Financial Fraud</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleProceedToMuleTrace}
            disabled={!formData.complaint_id || saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-md disabled:bg-gray-300 transition"
          >
            {saving ? "Registering Case..." : "Launch Mule Hop Tracing →"}
          </button>
        </div>
      </div>
    </div>
  );
}
