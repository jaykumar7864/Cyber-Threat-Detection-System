const mongoose = require("mongoose");

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, unique: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    password: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true }
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model("PendingRegistration", pendingRegistrationSchema);
