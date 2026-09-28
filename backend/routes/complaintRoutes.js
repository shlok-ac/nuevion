const express = require("express");
const router = express.Router();

const {
    createComplaint,
    getComplaintStatus,
    getAllComplaints
} = require("../controllers/complaintController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.post("/", createComplaint);
router.get("/:complaintNumber/status", getComplaintStatus);

router.get(
    "/",
    authenticateToken,
    authorizeRoles("analyst"),
    getAllComplaints
);

module.exports = router;