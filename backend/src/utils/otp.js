const crypto = require("crypto");

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function buildOtpExpiry(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = { generateOtp, hashOtp, buildOtpExpiry };
