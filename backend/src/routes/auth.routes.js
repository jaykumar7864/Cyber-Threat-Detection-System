const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const auth = require("../middleware/auth");
const {
  registerSchema,
  loginSchema,
  verifyRegistrationOtpSchema,
  resendRegistrationOtpSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResetSchema
} = require("../validators/auth.validators");
const { generateOtp, hashOtp, buildOtpExpiry } = require("../utils/otp");
const {
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail
} = require("../services/brevo.service");

const OTP_EXPIRY_MINUTES = 10;

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, phone: user.phone, name: user.name, role: user.role || "user" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role || "user",
    emailVerified: user.emailVerified !== false
  };
}

async function issuePendingRegistrationOtp(registration) {
  const otp = generateOtp();
  registration.otpHash = hashOtp(otp);
  registration.otpExpiresAt = buildOtpExpiry(OTP_EXPIRY_MINUTES);
  await registration.save();

  await sendRegistrationOtpEmail({
    email: registration.email,
    name: registration.name,
    otp,
    expiryMinutes: OTP_EXPIRY_MINUTES
  });
}

async function issuePasswordResetOtp(user) {
  const otp = generateOtp();
  user.passwordResetOtpHash = hashOtp(otp);
  user.passwordResetOtpExpiresAt = buildOtpExpiry(OTP_EXPIRY_MINUTES);
  await user.save();

  await sendPasswordResetOtpEmail({
    email: user.email,
    name: user.name,
    otp,
    expiryMinutes: OTP_EXPIRY_MINUTES
  });
}

router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUserByEmail = await User.findOne({ email: data.email });
    if (existingUserByEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const existingUserByPhone = await User.findOne({ phone: data.phone });
    if (existingUserByPhone) {
      return res.status(409).json({ message: "Phone number already registered" });
    }

    const pendingByEmail = await PendingRegistration.findOne({ email: data.email });
    const pendingByPhone = await PendingRegistration.findOne({ phone: data.phone });

    if (pendingByPhone && (!pendingByEmail || String(pendingByPhone._id) !== String(pendingByEmail._id))) {
      return res.status(409).json({ message: "Phone number is already being used in another pending signup" });
    }

    const registration = pendingByEmail || new PendingRegistration();
    registration.name = data.name;
    registration.email = data.email;
    registration.phone = data.phone;
    registration.role = data.role;
    registration.password = data.password;

    await issuePendingRegistrationOtp(registration);

    return res.json({
      message: "Verification OTP sent to your email",
      email: registration.email
    });
  } catch (e) {
    return res.status(400).json({ message: e?.errors?.[0]?.message || e.message || "Invalid data" });
  }
});

router.post("/verify-registration-otp", async (req, res) => {
  try {
    const data = verifyRegistrationOtpSchema.parse(req.body);
    const registration = await PendingRegistration.findOne({ email: data.email });
    if (!registration) return res.status(404).json({ message: "Pending signup not found" });

    const isOtpValid =
      registration.otpHash &&
      registration.otpExpiresAt &&
      registration.otpExpiresAt > new Date() &&
      registration.otpHash === hashOtp(data.otp);

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const existingUserByEmail = await User.findOne({ email: registration.email });
    if (existingUserByEmail) {
      await PendingRegistration.deleteOne({ _id: registration._id });
      return res.status(409).json({ message: "Email already registered" });
    }

    const existingUserByPhone = await User.findOne({ phone: registration.phone });
    if (existingUserByPhone) {
      await PendingRegistration.deleteOne({ _id: registration._id });
      return res.status(409).json({ message: "Phone number already registered" });
    }

    const user = await User.create({
      name: registration.name,
      email: registration.email,
      phone: registration.phone,
      role: registration.role || "user",
      password: registration.password,
      emailVerified: true,
      emailVerificationOtpHash: null,
      emailVerificationOtpExpiresAt: null
    });

    await PendingRegistration.deleteOne({ _id: registration._id });

    const token = signToken(user);
    return res.json({ token, user: publicUser(user), message: "Email verified and account created successfully" });
  } catch (e) {
    return res.status(400).json({ message: e?.errors?.[0]?.message || e.message || "Invalid data" });
  }
});

router.post("/resend-registration-otp", async (req, res) => {
  try {
    const data = resendRegistrationOtpSchema.parse(req.body);
    const registration = await PendingRegistration.findOne({ email: data.email });
    if (!registration) return res.status(404).json({ message: "Pending signup not found" });

    await issuePendingRegistrationOtp(registration);
    return res.json({ message: "A new verification OTP has been sent" });
  } catch (e) {
    return res.status(400).json({ message: e?.errors?.[0]?.message || e.message || "Invalid data" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const identifier = data.identifier.trim().toLowerCase();
    const user = await User.findOne(
      identifier.includes("@") ? { email: identifier } : { phone: data.identifier.trim() }
    );
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if ((user.role || "user") !== data.role) {
      return res.status(403).json({ message: `This account is not registered as ${data.role}` });
    }
    if (data.password !== user.password) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (e) {
    return res.status(400).json({ message: e?.errors?.[0]?.message || e.message || "Invalid data" });
  }
});

router.post("/forgot-password/request-otp", async (req, res) => {
  try {
    const data = forgotPasswordRequestSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    await issuePasswordResetOtp(user);
    return res.json({ message: "Password reset OTP sent to your email" });
  } catch (e) {
    return res.status(400).json({ message: e?.errors?.[0]?.message || e.message || "Invalid data" });
  }
});

router.post("/forgot-password/reset", async (req, res) => {
  try {
    const data = forgotPasswordResetSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isOtpValid =
      user.passwordResetOtpHash &&
      user.passwordResetOtpExpiresAt &&
      user.passwordResetOtpExpiresAt > new Date() &&
      user.passwordResetOtpHash === hashOtp(data.otp);

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = data.newPassword;
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (e) {
    return res.status(400).json({ message: e?.errors?.[0]?.message || e.message || "Invalid data" });
  }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("_id name email phone role emailVerified createdAt");
  return res.json({ user });
});

module.exports = router;
