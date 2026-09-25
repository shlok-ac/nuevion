const express = require("express");
const router = express.Router();

const {
    saveMLResult
} = require("../controllers/mlController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.post(
    "/result",
    authenticateToken,
    authorizeRoles("analyst"),
    saveMLResult
);

module.exports = router;