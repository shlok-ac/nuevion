const express = require("express");
const router = express.Router();

const {
    getLatestPredictions,
    saveMLResult
} = require("../controllers/mlController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get(
    "/predictions",
    authenticateToken,
    authorizeRoles("analyst"),
    getLatestPredictions
);

router.post(
    "/result",
    authenticateToken,
    authorizeRoles("analyst"),
    saveMLResult
);

module.exports = router;