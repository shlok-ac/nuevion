import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function VoiceTriagePage() {
  const navigate = useNavigate();
  const [audioFile, setAudioFile] = useState(null);
  const [sourceLang, setSourceLang] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state auto-populated by the NLP engine
  const [formData, setFormData] = useState({
    complaint_id: "",
    incident_date: "",
    incident_time: "",
    incident_place: "",
    stolen_amount_inr: "",
    transfer_mode: "UPI",
    initial_mule_account: "",
    scam_category: "FINANCIAL_FRAUD",
    english_transcript: "",
  });

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

    const payload = new FormData();
    payload.append("audio", audioFile);
    if (sourceLang !== "auto") {
      payload.append("source_lang", sourceLang);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/complaints/triage-voice`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.status === "success") {
        const data = response.data.complaint;
        setFormData({
          complaint_id: data.complaint_id || "",
          incident_date: data.incident_date || "",
          incident_time: data.incident_time || "",
          incident_place: data.incident_place || "",
          stolen_amount_inr: data.stolen_amount_inr || "",
          transfer_mode: data.transfer_mode || "UPI",
          initial_mule_account: data.initial_mule_account || "",
          scam_category: data.scam_category || "FINANCIAL_FRAUD",
          english_transcript: data.english_transcript || "",
        });
      }
    } catch (err) {
      console.error("Triage error:", err);
      setError(err.response?.data?.message || err.message || "Audio processing failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProceedToMuleTrace = () => {
    // Navigate straight to your existing case/trace screen with prefilled mule details
    navigate("/cases", { state: { prefillComplaint: formData } });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">1930 Voice Intake & Speech Triage</h1>
        <p className="text-sm text-gray-500">
          Upload vernacular distress call recordings to auto-transcribe via Bhashini and extract financial fraud entities.
        </p>
      </div>

      {/* 1. Upload & Ingestion Section */}
      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">1. Audio Recording Input</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Audio File (.mp3, .wav)</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indic Language Channel</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="auto">Auto-Detect via Acoustic Engine</option>
              <option value="hi">Hindi (hi)</option>
              <option value="pa">Punjabi (pa)</option>
              <option value="mr">Marathi (mr)</option>
              <option value="bn">Bengali (bn)</option>
              <option value="ta">Tamil (ta)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleProcessAudio}
          disabled={loading || !audioFile}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-md disabled:bg-gray-400 transition"
        >
          {loading ? "Processing via Bhashini & Extracting..." : "Process Call Audio"}
        </button>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
      </div>

      {/* 2. Audio Transcript Preview */}
      {formData.english_transcript && (
        <div className="bg-gray-50 border rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Translated Transcript</h3>
          <p className="text-gray-800 italic text-sm font-mono">"{formData.english_transcript}"</p>
        </div>
      )}

      {/* 3. Extracted Incident Entities Form */}
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
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleProceedToMuleTrace}
            disabled={!formData.initial_mule_account}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-md disabled:bg-gray-300 transition"
          >
            Launch Mule Hop Tracing →
          </button>
        </div>
      </div>
    </div>
  );
}
