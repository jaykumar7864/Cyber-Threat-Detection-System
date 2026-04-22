const router = require("express").Router();
const auth = require("../middleware/auth");
const DetectionHistory = require("../models/DetectionHistory");

// Logged-in user's history
router.get("/me", auth, async (req, res) => {
  const items = await DetectionHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
  return res.json({ items });
});

// Public recent (no login) - useful for demo; returns last 50 SAFE/ATTACK mixed
router.get("/public", async (req, res) => {
  const items = await DetectionHistory.find({ userId: null }).sort({ createdAt: -1 }).limit(50);
  return res.json({ items });
});

module.exports = router;
