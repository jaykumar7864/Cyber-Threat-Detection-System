const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function getSenderConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const email = process.env.BREVO_SENDER_EMAIL;
  const name = process.env.BREVO_SENDER_NAME || "CyberShield";

  if (!apiKey || !email) {
    throw new Error("Brevo is not configured. Add BREVO_API_KEY and BREVO_SENDER_EMAIL to backend .env");
  }

  return { apiKey, sender: { email, name } };
}

async function sendTransactionalEmail({ to, subject, htmlContent, textContent }) {
  const { apiKey, sender } = getSenderConfig();

  await axios.post(
    BREVO_API_URL,
    {
      sender,
      to: [{ email: to.email, name: to.name }],
      subject,
      htmlContent,
      textContent
    },
    {
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      }
    }
  );
}

function buildOtpEmail({ name, otp, title, intro, expiryMinutes }) {
  const safeName = name || "there";
  const safeOtp = String(otp);
  const safeTitle = title;
  const safeIntro = intro;
  const safeExpiry = String(expiryMinutes);

  return {
    subject: `${safeTitle} - CyberShield`,
    textContent: `${safeIntro}\n\nYour OTP is ${safeOtp}. It expires in ${safeExpiry} minutes.\n\nIf you did not request this, please ignore this email.`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:32px;color:#10233f;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe5f0;">
          <div style="font-size:24px;font-weight:800;margin-bottom:10px;">CyberShield</div>
          <div style="font-size:20px;font-weight:700;margin-bottom:12px;">${safeTitle}</div>
          <p style="margin:0 0 14px;line-height:1.7;">Hi ${safeName},</p>
          <p style="margin:0 0 18px;line-height:1.7;">${safeIntro}</p>
          <div style="margin:24px 0;padding:18px 20px;border-radius:16px;background:#0f172a;color:#f8fafc;text-align:center;">
            <div style="font-size:13px;letter-spacing:1.8px;text-transform:uppercase;opacity:0.7;">One-Time Password</div>
            <div style="font-size:34px;font-weight:800;letter-spacing:8px;margin-top:10px;">${safeOtp}</div>
          </div>
          <p style="margin:0 0 10px;line-height:1.7;">This OTP expires in <strong>${safeExpiry} minutes</strong>.</p>
          <p style="margin:0;color:#475569;line-height:1.7;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    `
  };
}

async function sendRegistrationOtpEmail({ email, name, otp, expiryMinutes = 10 }) {
  const emailContent = buildOtpEmail({
    name,
    otp,
    expiryMinutes,
    title: "Verify your email",
    intro: "Use the OTP below to verify your email address and finish creating your account."
  });

  await sendTransactionalEmail({
    to: { email, name },
    ...emailContent
  });
}

async function sendPasswordResetOtpEmail({ email, name, otp, expiryMinutes = 10 }) {
  const emailContent = buildOtpEmail({
    name,
    otp,
    expiryMinutes,
    title: "Reset your password",
    intro: "Use the OTP below to continue resetting your password."
  });

  await sendTransactionalEmail({
    to: { email, name },
    ...emailContent
  });
}

module.exports = {
  sendRegistrationOtpEmail,
  sendPasswordResetOtpEmail
};
