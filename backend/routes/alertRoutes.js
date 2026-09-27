const express = require("express");
const router = express.Router();

const {
    getAllAlerts
} = require("../controllers/alertController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get(
    "/",
    authenticateToken,
    authorizeRoles("analyst"),
    getAllAlerts
);

module.exports = router;