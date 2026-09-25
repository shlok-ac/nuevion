const express = require("express");
const router = express.Router();

const {
    getAllComplaints
} = require("../controllers/complaintController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get(
    "/",
    authenticateToken,
    authorizeRoles("analyst"),
    getAllComplaints
);

module.exports = router;