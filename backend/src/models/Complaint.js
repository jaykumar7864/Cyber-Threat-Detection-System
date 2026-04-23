const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true }, // e.g. PHISHING / MALWARE...
    subject: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 2000 },
    evidenceType: { type: String, enum: ["TEXT", "LINK", "FILE"], default: "TEXT" },
    evidenceText: { type: String, default: "", maxlength: 4000 },
    attachment: {
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
      data: { type: String, default: "" }
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "PENDING"
    },
    adminResponse: { type: String, default: "" },
    hasUnreadAdminUpdate: { type: Boolean, default: false },
    adminResponseSeenAt: { type: Date, default: null },
    isNewForAdmin: { type: Boolean, default: true },
    lastStatusUpdatedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
