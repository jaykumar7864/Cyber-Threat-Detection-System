 // backend/src/utils/urlLists.js

const TRUSTED_DOMAINS = [
  "microsoft.com",
  "google.com",
  "github.com",
  "openai.com",
  "amazon.com",
  "apple.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com"
];

// Suspicious patterns / shorteners / common phishing terms
const SUSPICIOUS_KEYWORDS = [
  "bit.ly",
  "tinyurl",
  "t.co",
  "goo.gl",
  "login",
  "verify",
  "account",
  "update",
  "password",
  "bank",
  "secure",
  "confirm",
  "free",
  "gift",
  "claim"
];

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isTrusted(url) {
  const host = hostOf(url);
  if (!host) return false;
  return TRUSTED_DOMAINS.some(d => host === d || host.endsWith("." + d));
}

function isSuspicious(url) {
  const u = String(url || "").toLowerCase();

  // @ trick in URL
  if (u.includes("@")) return { ok: true, why: "@ symbol in URL" };

  // too many subdomains
  const host = hostOf(url);
  if (host && host.split(".").length >= 5) return { ok: true, why: "Too many subdomains" };

  // keywords / shorteners
  const hit = SUSPICIOUS_KEYWORDS.find(k => u.includes(k));
  if (hit) return { ok: true, why: `Suspicious keyword: ${hit}` };

  return { ok: false, why: "" };
}

module.exports = { isTrusted, isSuspicious };
