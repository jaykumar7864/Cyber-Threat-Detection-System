const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const Complaint = require("../models/Complaint");
const { complaintSchema, adminComplaintUpdateSchema } = require("../validators/complaint.validators");
const { sendComplaintStatusEmail } = require("../services/notification.service");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

async function sendAdminUpdateNotification(complaint) {
  if (!complaint?.userId?.email) return;

  try {
    await sendComplaintStatusEmail({
      toEmail: complaint.userId.email,
      userName: complaint.userId.name,
      subject: complaint.subject,
      status: complaint.status,
      adminResponse: complaint.adminResponse
    });
  } catch (error) {
    console.error("Complaint notification failed:", error.message);
  }
}

router.post("/", auth, upload.single("attachment"), async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admins cannot create user complaints" });
    }

    const data = complaintSchema.parse(req.body);
    if (data.evidenceType === "FILE" && !req.file) {
      return res.status(400).json({ message: "Please upload a file for this complaint category" });
    }

    const attachment = req.file
      ? {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          data: req.file.buffer.toString("base64")
        }
      : undefined;

    const doc = await Complaint.create({
      userId: req.user.id,
      ...data,
      isNewForAdmin: true,
      attachment
    });
    return res.json({ complaint: doc });
  } catch (e) {
    return res.status(400).json({ message: e?.errors?.[0]?.message || e.message || "Invalid data" });
  }
});

router.get("/me", auth, async (req, res) => {
  const items = await Complaint.find({ userId: req.user.id, hiddenForUser: { $ne: true } }).sort({ createdAt: -1 }).limit(200);
  return res.json({ items });
});

router.get("/all", auth, requireAdmin, async (req, res) => {
  const items = await Complaint.find({ hiddenForAdmin: { $ne: true } })
    .populate("userId", "name email phone role")
    .sort({ createdAt: -1 })
    .limit(500);

  return res.json({ items });
});

router.patch("/:id/admin", auth, requireAdmin, async (req, res) => {
  try {
    const data = adminComplaintUpdateSchema.parse(req.body);
    const complaint = await Complaint.findById(req.params.id).populate("userId", "name email phone role");
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    complaint.status = data.status;
    complaint.adminResponse = data.adminResponse;
    complaint.hasUnreadAdminUpdate = true;
    complaint.adminResponseSeenAt = null;
    complaint.isNewForAdmin = false;
    complaint.lastStatusUpdatedAt = new Date();
    await complaint.save();
    await complaint.populate("userId", "name email phone role");

    await sendAdminUpdateNotification(complaint);

    return res.json({ complaint });
  } catch (e) {
    return res.status(400).json({ message: e?.errors?.[0]?.message || e.message || "Invalid data" });
  }
});

router.patch("/:id/mark-read", auth, async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, userId: req.user.id });
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });

  complaint.hasUnreadAdminUpdate = false;
  complaint.adminResponseSeenAt = new Date();
  await complaint.save();
  return res.json({ ok: true });
});

router.delete("/:id", auth, async (req, res) => {
  if (req.user.role === "admin") {
    const found = await Complaint.findById(req.params.id);
    if (!found) return res.status(404).json({ message: "Complaint not found" });
    found.hiddenForAdmin = true;
    await found.save();
    return res.json({ ok: true });
  }

  const { id } = req.params;
  const found = await Complaint.findOne({ _id: id, userId: req.user.id });
  if (!found) return res.status(404).json({ message: "Complaint not found" });
  found.hiddenForUser = true;
  await found.save();
  return res.json({ ok: true });
});

router.post("/bulk-delete", auth, async (req, res) => {
  if (req.user.role === "admin") {
    return res.status(403).json({ message: "Admins cannot bulk delete user complaints from this endpoint" });
  }

  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
  if (!ids.length) return res.status(400).json({ message: "No complaints selected" });

  const r = await Complaint.updateMany(
    { userId: req.user.id, _id: { $in: ids } },
    { $set: { hiddenForUser: true } }
  );
  return res.json({ ok: true, deleted: r.modifiedCount || 0 });
});

router.delete("/me/all", auth, async (req, res) => {
  if (req.user.role === "admin") {
    return res.status(403).json({ message: "Admins cannot delete user complaints from this endpoint" });
  }

  const r = await Complaint.updateMany(
    { userId: req.user.id, hiddenForUser: { $ne: true } },
    { $set: { hiddenForUser: true } }
  );
  return res.json({ ok: true, deleted: r.modifiedCount || 0 });
});

module.exports = router;
