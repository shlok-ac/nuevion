const express = require("express");
const router = express.Router();

const {
    getAllCases
} = require("../controllers/caseController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get(
    "/",
    authenticateToken,
    authorizeRoles("analyst"),
    getAllCases
);

module.exports = router;