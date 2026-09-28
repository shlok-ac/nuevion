const express = require("express");
const router = express.Router();

const {
    getDashboardData
} = require("../controllers/dashboardController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get(
    "/",
    authenticateToken,
    authorizeRoles("analyst"),
    getDashboardData
);

module.exports = router;
