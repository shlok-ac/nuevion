const { analyzeComplaintText } = require("../services/nlpService");

const analyzeText = async (req, res) => {
    const text = req.body?.text;
    if (typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ message: "text must be a non-empty string" });
    }
    if (text.length > 8000) {
        return res.status(413).json({ message: "text must not exceed 8000 characters" });
    }

    try {
        const analysis = await analyzeComplaintText(text);
        return res.json({ data: analysis });
    } catch (error) {
        console.error("NLP analysis request failed:", error.message);
        return res.status(503).json({ message: "NLP analysis is unavailable" });
    }
};

module.exports = { analyzeText };
