const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, unique: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    password: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationOtpHash: { type: String, default: null },
    emailVerificationOtpExpiresAt: { type: Date, default: null },
    passwordResetOtpHash: { type: String, default: null },
    passwordResetOtpExpiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("User", userSchema);
