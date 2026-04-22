const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true }, // e.g. PHISHING / MALWARE...
    subject: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "PENDING"
    },
    adminResponse: { type: String, default: "" },
    lastStatusUpdatedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
