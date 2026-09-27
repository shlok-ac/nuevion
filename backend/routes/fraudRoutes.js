const express = require("express");
const router = express.Router();

const {
    traceFraud
} = require("../controllers/fraudController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get(
    "/trace/:complaintId",
    authenticateToken,
    authorizeRoles("analyst"),
    traceFraud
);

module.exports = router;