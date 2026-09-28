const express = require("express");
const router = express.Router();
const { analyzeText } = require("../controllers/nlpController");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");

router.post("/analyze", authenticateToken, authorizeRoles("analyst"), analyzeText);

module.exports = router;
