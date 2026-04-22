const mongoose = require("mongoose");

const detectionHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    inputType: { type: String, enum: ["text", "url", "file", "password"], default: "text" },
    input: { type: String, required: true },
    ruleResult: { type: String, required: true },  // e.g. "PHISHING"
    mlResult: { type: String, required: true },    // e.g. "PHISHING"
    finalResult: { type: String, required: true }, // e.g. "PHISHING"
    confidence: { type: Number, default: 0 },      // 0..1 (ML if available)
    signals: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("DetectionHistory", detectionHistorySchema);
