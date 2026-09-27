const express = require("express");
const router = express.Router();

const {
    getAllATMs
} = require("../controllers/atmController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get(
    "/",
    authenticateToken,
    authorizeRoles("analyst"),
    getAllATMs
);

module.exports = router;