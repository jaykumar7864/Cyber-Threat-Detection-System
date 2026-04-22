const { z } = require("zod");

const phoneRegex = /^[6-9]\d{9}$/;
const otpRegex = /^\d{6}$/;
const roleSchema = z.enum(["user", "admin"]);

const passwordSchema = z.string().min(6).max(80);
const emailSchema = z.string().trim().toLowerCase().email();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: emailSchema,
  phone: z.string().trim().regex(phoneRegex, "Enter a valid 10-digit phone number"),
  role: roleSchema.default("user"),
  password: passwordSchema
});

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or phone is required")
    .refine((value) => emailSchema.safeParse(value).success || phoneRegex.test(value), {
      message: "Enter a valid email or 10-digit phone number"
    }),
  role: roleSchema.default("user"),
  password: passwordSchema
});

const verifyRegistrationOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().trim().regex(otpRegex, "Enter a valid 6-digit OTP")
});

const resendRegistrationOtpSchema = z.object({
  email: emailSchema
});

const forgotPasswordRequestSchema = z.object({
  email: emailSchema
});

const forgotPasswordResetSchema = z.object({
  email: emailSchema,
  otp: z.string().trim().regex(otpRegex, "Enter a valid 6-digit OTP"),
  newPassword: passwordSchema
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyRegistrationOtpSchema,
  resendRegistrationOtpSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResetSchema
};
