const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Complaint routes
const complaintRoutes = require("./routes/complaintRoutes");
const caseRoutes = require("./routes/caseRoutes");
const atmRoutes = require("./routes/atmRoutes");
const alertRoutes = require("./routes/alertRoutes");
const fraudRoutes = require("./routes/fraudRoutes");
const mlRoutes = require("./routes/mlRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api/complaints", complaintRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/atms", atmRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Cyber Fraud Detection Backend is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});