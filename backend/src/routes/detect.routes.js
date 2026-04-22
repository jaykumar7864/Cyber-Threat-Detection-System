



const express = require("express");
const router = express.Router();
const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const auth = require("../middleware/auth");
const DetectionHistory = require("../models/DetectionHistory");
const { predictPhishingUrl, predictSpamText, predictMalwareFile } = require("../utils/mlRunner");
const { isTrusted } = require("../utils/urlLists");

const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 20000);

// ================= Helpers =================

function normalizeAttackType(attackType) {
  const s = String(attackType || "").toLowerCase().trim();
  if (s === "sql injection") return "sql-injection";
  if (s === "brute force") return "brute-force";
  if (s === "password strength") return "password";
  if (s === "password strength checker") return "password";
  return s;
}

function clamp01(n, fallback = 0.5) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(1, x));
}
function toPercent01(n01) {
  return Math.round(clamp01(n01) * 100);
}
function normalizeMlLabel(label, allowed = []) {
  const s = String(label || "").trim().toUpperCase();
  if (!s) return allowed[0] || "SAFE";
  if (!allowed.length) return s;
  return allowed.includes(s) ? s : (allowed[0] || "SAFE");
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return !!u.protocol && !!u.hostname;
  } catch {
    return false;
  }
}

function urlSignals(url) {
  const signals = [];
  try {
    const u = new URL(String(url || ""));
    const host = (u.hostname || "").toLowerCase();
    const pathAndQuery = ((u.pathname || "") + (u.search || "")).toLowerCase();

    const shorteners = ["bit.ly","tinyurl.com","t.co","goo.gl","is.gd","cutt.ly","rb.gy"];
    if (shorteners.some((d) => host === d || host.endsWith("." + d))) signals.push("shortener");

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) signals.push("ip_host");
    if (host.startsWith("xn--")) signals.push("punycode");
    if (String(url || "").includes("@")) signals.push("at_symbol");

const raw = String(url || "");
if (raw.includes('"') || raw.includes("'")) signals.push("quote_char");

// risky TLDs commonly abused in scams/phishing
const riskyTlds = ["ml","tk","ga","cf","gq","top","xyz","click","link","work","zip"];
const tld = host.split(".").slice(-1)[0] || "";
if (riskyTlds.includes(tld)) signals.push("risky_tld");

// brand impersonation: brand keywords in host but not the real domain
const brandKeywords = ["facebook","google","microsoft","paypal","instagram","apple","amazon","netflix"];
const looksBrand = brandKeywords.some((b) => host.includes(b));
const realBrandDomains = ["facebook.com","fb.com","google.com","microsoft.com","paypal.com","instagram.com","apple.com","amazon.com","netflix.com"];
const isRealBrand = realBrandDomains.some((d) => host === d || host.endsWith("." + d));
if (looksBrand && !isRealBrand) signals.push("brand_impersonation");
    if (String(url || "").length > 180) signals.push("very_long_url");

    // Suspicious terms: only in path/query (avoid false positives like secure.google.com)
    const badWords = ["login","verify","update","bank","wallet","otp","password","confirm","reset","kyc"];
    if (badWords.some((w) => pathAndQuery.includes(w))) signals.push("suspicious_terms");

    if ((u.pathname || "").split("/").filter(Boolean).length > 6) signals.push("deep_path");
  } catch {
    signals.push("invalid_url");
  }
  return signals;
}

/**
 * Confidence helpers (0..100)
 */

function clampPercent(p, fallback = 50) {
  const n = Number(p);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(99, Math.round(n)));
}

function confidenceFromRuleMatch({ isAttack, matchedCount, strongCount = 0, weakSignals = 0, textLen = 0 }) {
  // More input-dependent than a fixed 60/90.
  // Attack: 62..99, Safe: 55..98 (drops if suspicious hints exist).
  if (isAttack) {
    const raw = 62 + matchedCount * 6 + strongCount * 10 + weakSignals * 3;
    return clampPercent(raw, 80);
  }

  // SAFE confidence rises a bit with length (more evidence) but falls with suspicious hints.
  const lenBoost = Math.min(8, Math.floor(Number(textLen || 0) / 25)); // 0..8
  const raw = 86 + lenBoost - weakSignals * 10 - strongCount * 8;
  return clampPercent(raw, 75);
}

function probFromMlLabel(label, confidence01, positiveLabel) {
  // Returns probability of the positive class.
  const c = clamp01(confidence01, 0.5);
  const s = String(label || "").toUpperCase();
  return s === String(positiveLabel || "").toUpperCase() ? c : (1 - c);
}

function combineProb(mlProb01, heuristicProb01, mlWeight = 0.65) {
  const w = clamp01(mlWeight, 0.65);
  const a = clamp01(mlProb01, 0.5);
  const b = clamp01(heuristicProb01, 0.5);
  return clamp01(a * w + b * (1 - w), 0.5);
}

function spamRuleScore(text) {
  const t = String(text || "");
  const low = t.toLowerCase();

  const signals = [];
  let score = 0;

  const hasUrl = /(https?:\/\/|www\.)/i.test(t);
  const hasShortener = /(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy)/i.test(low);
  const hasMoney = /(?:₹|rs\.?|rupees|cash|money|profit|investment|loan|credit)/i.test(low);
  const hasInvestmentScam = /(invest|investment|earn|earning|returns?|profit|guaranteed|daily\s+income|double\s+money|work\s+from\s+home|crypto|trading|forex|followers?|subscribers?)/i.test(low);
  const hasTooGood = /(guaranteed\s+profit|100%\s+safe|risk\s*free|no\s*risk|assured\s*returns?|earn\s*₹?\s*\d+\s*(daily|per\s*day)|limited\s*time)/i.test(low);
  const hasCredentials = /(otp|password|cvv|pin|kyc|account|bank|upi)/i.test(low);
  const hasPromo = /(free|winner|won|prize|lottery|congratulations|offer|discount|deal|limited\s*time|claim\s+now)/i.test(low);
  const hasAction = /(click|tap|open|visit|subscribe|call\s+now|whatsapp|telegram)/i.test(low);
  const hasPhoneOrLongNum = /(\b\d{10,}\b|\b\d{4}[-\s]\d{4}[-\s]\d{4}\b)/.test(t);

  if (hasUrl) { signals.push("has_url"); score += 0.30; }
  if (hasShortener) { signals.push("shortener"); score += 0.22; }
  if (hasCredentials) { signals.push("credentials_terms"); score += 0.22; }
  if (hasPromo) { signals.push("promo_terms"); score += 0.18; }
  if (hasMoney) { signals.push("money_terms"); score += 0.15; }
  if (hasInvestmentScam) { signals.push("investment_scam_terms"); score += 0.22; }
  if (hasTooGood) { signals.push("too_good_to_be_true"); score += 0.20; }
  if (hasAction) { signals.push("call_to_action"); score += 0.10; }
  if (hasPhoneOrLongNum) { signals.push("phone_or_long_number"); score += 0.12; }

  // Style hints
  if ((t.match(/!/g) || []).length >= 3) { signals.push("many_exclamations"); score += 0.06; }
  if (/\b[A-Z]{8,}\b/.test(t)) { signals.push("caps_word"); score += 0.05; }

  // Strong combo bumps (reduce harmful text being marked SAFE)
if ((hasUrl || hasPhoneOrLongNum) && (hasCredentials || hasPromo || hasMoney || hasInvestmentScam)) score = Math.max(score, 0.72);
if (hasShortener && (hasCredentials || hasPromo || hasInvestmentScam)) score = Math.max(score, 0.78);

// Investment / crypto scam without URL also should be NOT SAFE reliably
if (hasInvestmentScam && (hasMoney || hasTooGood)) score = Math.max(score, 0.75);
if (hasInvestmentScam && hasTooGood) score = Math.max(score, 0.82);

  return { score01: clamp01(score, 0.1), signals };
}

function phishingHeuristicScore(url, urlSig = []) {
  // urlSig from urlSignals()
  const sig = Array.isArray(urlSig) ? urlSig : [];
  const u = String(url || "");
  let strong = 0;
  let weak = 0;

  if (sig.includes("ip_host")) strong += 2;
  if (sig.includes("punycode")) strong += 2;
  if (sig.includes("at_symbol")) strong += 2;
  if (sig.includes("shortener")) strong += 2;
if (sig.includes("invalid_url")) strong += 2;
if (sig.includes("quote_char")) strong += 2;
if (sig.includes("brand_impersonation")) strong += 2;
if (sig.includes("risky_tld")) weak += 2;
  if (sig.includes("suspicious_terms")) weak += 2;
  if (sig.includes("very_long_url")) weak += 1;
  if (sig.includes("deep_path")) weak += 1;

  // additional weak hints
  if (!/^https:\/\//i.test(u)) weak += 1; // https missing
  const score = Math.max(0, Math.min(1, 0.10 + strong * 0.20 + weak * 0.08));
  return { score01: score, strongCount: strong, weakCount: weak };
}

function passwordStrength(pw) {
  const s = String(pw || "");
  let score = 0;
  const signals = [];

  if (s.length >= 8) score += 1; else signals.push("min_length_8");
  if (s.length >= 12) score += 1;
  if (/[A-Z]/.test(s)) score += 1; else signals.push("uppercase");
  if (/[a-z]/.test(s)) score += 1; else signals.push("lowercase");
  if (/[0-9]/.test(s)) score += 1; else signals.push("number");
  if (/[^A-Za-z0-9]/.test(s)) score += 1; else signals.push("symbol");

  // common weak patterns
  if (/^(1234|12345|123456|password|qwerty|admin)/i.test(s)) {
    score = Math.max(0, score - 2);
    signals.push("common_password");
  }
  if (/(\w)\1\1/.test(s)) {
    score = Math.max(0, score - 1);
    signals.push("repeating_chars");
  }

  let label = "WEAK";
  if (score >= 5) label = "STRONG";
  else if (score >= 3) label = "MEDIUM";

  // score01 in 0..1
  const score01 = Math.min(score, 6) / 6;

  return { label, score01, signals };
}

// ================= MAIN ROUTE =================

router.post("/", auth, upload.single("file"), async (req, res) => {
  const startedAt = Date.now();
  const signals = [];

  try {
    const { inputType, input, attackType } = req.body;
    const at = normalizeAttackType(attackType);

    // ---- Password Strength (Rule-based) ----
    if (at === "password") {
      const pw = String(input || "");
      if (pw.trim().length < 1) return res.status(400).json({ message: "Password is required" });

      const pwRes = passwordStrength(pw);
      const confidencePct = Math.round(pwRes.score01 * 100); // ✅ percent

      const saved = await DetectionHistory.create({
        userId: req.user.id,
        inputType: "password",
        input: "*".repeat(Math.min(10, pw.length)), // do not store raw password
        finalResult: pwRes.label,
        ruleResult: pwRes.label,
        mlResult: "—",
        confidence: confidencePct, // ✅ percent
        signals: pwRes.signals,
      });

      return res.json({
        result: {
          _id: saved._id,
          inputType: "password",
          input: saved.input,
          finalResult: saved.finalResult,
          ruleResult: saved.ruleResult,
          mlResult: saved.mlResult,
          confidence: saved.confidence,
          signals: saved.signals,
          createdAt: saved.createdAt,
        },
      });
    }

    // ---- Malware (File upload + ML) ----
    if (at === "malware") {
      if (!req.file) return res.status(400).json({ message: "File is required" });

      const original = req.file.originalname || "uploaded.bin";
      const tmpPath = path.join(
        os.tmpdir(),
        `ctdps_${Date.now()}_${Math.random().toString(16).slice(2)}_${original}`
      );
      fs.writeFileSync(tmpPath, req.file.buffer);

      let mlLabel = "SAFE";
      let confidence01 = 0.5;

      try {
        const ml = await predictMalwareFile(tmpPath, original);
        mlLabel = normalizeMlLabel(ml?.label, ["SAFE", "MALWARE"]);
        confidence01 = clamp01(ml?.confidence, 0.5);
      } catch (e) {
        signals.push("ml_unavailable");
      } finally {
        try { fs.unlinkSync(tmpPath); } catch {}
      }

      // Final: use ML label
      const finalResult = mlLabel === "MALWARE" ? "NOT SAFE" : "SAFE";
      const confidencePct = toPercent01(confidence01); // ✅ percent

      const saved = await DetectionHistory.create({
        userId: req.user.id,
        inputType: "file",
        input: original,
        finalResult,
        ruleResult: "—",
        mlResult: signals.includes("ml_unavailable") ? "—" : mlLabel,
        confidence: confidencePct, // ✅ percent
        signals,
      });

      return res.json({
        result: {
          _id: saved._id,
          inputType: "file",
          input: saved.input,
          finalResult: saved.finalResult,
          ruleResult: saved.ruleResult,
          mlResult: saved.mlResult,
          confidence: saved.confidence,
          signals: saved.signals,
          createdAt: saved.createdAt,
        },
      });
    }

    // ---- Phishing (URL + ML) ----
    if (at === "phishing") {
      const url = String(input || "");
      if (!isValidUrl(url)) return res.status(400).json({ message: "Valid URL is required (include http/https)" });

      const sig = urlSignals(url);
      signals.push(...sig);

      let mlLabel = "SAFE";
      let confidence01 = 0.5;

      try {
        const ml = await predictPhishingUrl(url);
        mlLabel = normalizeMlLabel(ml?.label, ["SAFE", "PHISHING"]);
        confidence01 = clamp01(ml?.confidence, 0.5);
      } catch {
        signals.push("ml_unavailable");
      }

      // heuristic probability from URL structure/signals
      const h = phishingHeuristicScore(url, sig);
      let probPhish01 = h.score01; // default to heuristic

      if (!signals.includes("ml_unavailable")) {
        const mlProb01 = probFromMlLabel(mlLabel, confidence01, "PHISHING");
        probPhish01 = combineProb(mlProb01, h.score01, 0.7);

        // ✅ reduce false positives on clean/benign URLs unless ML is very confident
        const isBenignLooking = sig.length === 0 && h.score01 < 0.25 && /^https:\/\//i.test(url);
        if (isBenignLooking && mlLabel === "PHISHING" && confidence01 < 0.8) {
          probPhish01 = Math.min(0.45, probPhish01);
          signals.push("benign_override");
        }

        // ✅ bump risk if multiple strong heuristic signals
        if (sig.length >= 3) probPhish01 = Math.max(probPhish01, 0.75);
        if (sig.includes("ip_host") || sig.includes("punycode")) probPhish01 = Math.max(probPhish01, 0.8);
      } else {
        // ML unavailable: rely more on heuristics/signals
        if (sig.length >= 3) probPhish01 = Math.max(probPhish01, 0.8);
      }


      // ✅ trusted domains: force SAFE for well-known domains unless there is strong structural evidence of phishing
const trusted = isTrusted(url);
const hasStrongSig = sig.some((s) => ["ip_host","punycode","at_symbol","shortener"].includes(s));
const hasSuspiciousPath = sig.includes("suspicious_terms"); // login/verify/update etc in path/query

if (trusted && !hasStrongSig) {
  // If it's a trusted domain and no strong URL tricks, treat as SAFE.
  // Allow NOT SAFE only when BOTH: suspicious path terms AND ML very confident.
  if (!(hasSuspiciousPath && mlLabel === "PHISHING" && confidence01 >= 0.93)) {
    probPhish01 = Math.min(probPhish01, 0.35);
    signals.push("trusted_domain_force_safe");
  }
}

// ✅ hard NOT SAFE for clearly malicious / malformed URLs
if (sig.includes("invalid_url") || sig.includes("quote_char")) probPhish01 = Math.max(probPhish01, 0.9);
if (sig.includes("brand_impersonation") && sig.includes("risky_tld")) probPhish01 = Math.max(probPhish01, 0.88);


      const finalResult = probPhish01 >= 0.55 ? "NOT SAFE" : "SAFE";
      const confidencePct = clampPercent(Math.max(probPhish01, 1 - probPhish01) * 100);

      const saved = await DetectionHistory.create({
        userId: req.user.id,
        inputType: "url",
        input: url,
        finalResult,
        ruleResult: sig.length ? sig.join(",") : "—",
        mlResult: signals.includes("ml_unavailable") ? "—" : mlLabel,
        confidence: confidencePct, // ✅ percent
        signals,
      });

      return res.json({
        result: {
          _id: saved._id,
          inputType: "url",
          input: saved.input,
          finalResult: saved.finalResult,
          ruleResult: saved.ruleResult,
          mlResult: saved.mlResult,
          confidence: saved.confidence,
          signals: saved.signals,
          createdAt: saved.createdAt,
        },
      });
    }

    // ---- Spam (Text + ML + Rules) ----
    if (at === "spam") {
      const text = String(input || "");
      if (text.trim().length < 3) return res.status(400).json({ message: "Text is required" });

      const rule = spamRuleScore(text);
      if (rule?.signals?.length) signals.push(...rule.signals);

      let mlLabel = "SAFE";
      let confidence01 = 0.5;

      try {
        const ml = await predictSpamText(text);
        mlLabel = normalizeMlLabel(ml?.label, ["SAFE", "SPAM"]);
        confidence01 = clamp01(ml?.confidence, 0.5);
      } catch {
        signals.push("ml_unavailable");
      }

      let probSpam01 = rule.score01;

      if (!signals.includes("ml_unavailable")) {
        const mlProb01 = probFromMlLabel(mlLabel, confidence01, "SPAM");
        // blend ML and rules to reduce random false SAFE
        probSpam01 = combineProb(mlProb01, rule.score01, 0.6);

        // if strong rule signals exist, bump probability (e.g., url + keywords)
        if (rule.score01 >= 0.55) probSpam01 = Math.max(probSpam01, 0.7);
        if (rule.score01 >= 0.75) probSpam01 = Math.max(probSpam01, 0.85);
      } else {
        // ML unavailable: rules only
        probSpam01 = Math.max(rule.score01, 0.25);
      }

      const finalResult = probSpam01 >= 0.55 ? "NOT SAFE" : "SAFE";
      const confidencePct = clampPercent(Math.max(probSpam01, 1 - probSpam01) * 100);

      const saved = await DetectionHistory.create({
        userId: req.user.id,
        inputType: "text",
        input: text.slice(0, 500),
        finalResult,
        ruleResult: rule?.signals?.length ? rule.signals.join(",") : "—",
        mlResult: signals.includes("ml_unavailable") ? "—" : mlLabel,
        confidence: confidencePct, // ✅ percent
        signals,
      });

      return res.json({
        result: {
          _id: saved._id,
          inputType: saved.inputType,
          input: saved.input,
          finalResult: saved.finalResult,
          ruleResult: saved.ruleResult,
          mlResult: saved.mlResult,
          confidence: saved.confidence,
          signals: saved.signals,
          createdAt: saved.createdAt,
        },
      });
    }

    // ---- SQL Injection (Pattern-based) ----
    if (at === "sql-injection") {
      const text = String(input || "");
      if (text.trim().length < 1) return res.status(400).json({ message: "Input is required" });

      const patterns = [
        /(\bor\b|\band\b)\s+1\s*=\s*1\b/i,
        /\bunion\s+select\b/i,
        /\bselect\b.*\bfrom\b/i,
        /\binsert\b.*\binto\b/i,
        /\bupdate\b.*\bset\b/i,
        /\bdelete\b.*\bfrom\b/i,
        /--/i,
        /\/\*/i,
        /;\s*drop\s+table\b/i,
        /\bxp_cmdshell\b/i,
        /\bsleep\s*\(/i,
        /\bbenchmark\s*\(/i,
        /'\s*or\s*'1'='1/i,
        /"\s*or\s*"1"="1/i,
        /"\s*[^"]*?\s*or\s*\(?\s*"1"\s*=\s*"1/i,
        /'\s*[^']*?\s*or\s*\(?\s*'1'\s*=\s*'1/i
      ];

      const matched = patterns.filter((p) => p.test(text)).map((p) => String(p));
      const isAttack = matched.length > 0;

      const finalResult = isAttack ? "NOT SAFE" : "SAFE";

      const strongCount = matched.filter((s) => /drop\s+table|xp_cmdshell|sleep\s*\(|benchmark\s*\(|or\s*\'1\'=\'1|or\s*\"1\"=\"1/i.test(s)).length;
      const weakSignals = (/\b(select|union|where|from|insert|update|delete)\b/i.test(text) ? 1 : 0) + (text.includes("--") ? 1 : 0) + (text.includes("/*") ? 1 : 0);
      const confidencePct = confidenceFromRuleMatch({ isAttack, matchedCount: matched.length, strongCount, weakSignals, textLen: text.length });

      const saved = await DetectionHistory.create({
        userId: req.user.id,
        inputType: "text",
        input: text.slice(0, 500),
        finalResult,
        ruleResult: isAttack ? matched.slice(0, 4).join(" | ") : "—",
        mlResult: "—",
        confidence: confidencePct, // ✅ percent
        signals: isAttack ? ["sql_pattern_match"] : ["sql_no_match"],
      });

      return res.json({ result: saved });
    }

    // ---- XSS (Pattern-based + script tag) ----
    if (at === "xss") {
      const text = String(input || "");
      if (text.trim().length < 1) return res.status(400).json({ message: "Input is required" });

      const patterns = [
        /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/i,
        /<\s*img\b[^>]*\bonerror\s*=/i,
        /\bonload\s*=/i,
        /\bonmouseover\s*=/i,
        /\bjavascript\s*:/i,
        /document\.cookie/i,
        /<\s*svg\b[^>]*\bonload\s*=/i,
        /<\s*iframe\b/i,
        /<\s*body\b[^>]*\bonload\s*=/i
      ];

      const matched = patterns.filter((p) => p.test(text)).map((p) => String(p));
      const isAttack = matched.length > 0;

      const finalResult = isAttack ? "NOT SAFE" : "SAFE";

      const strongCount = matched.filter((s) => /<\s*script\b|javascript\s*:|onerror\s*=|onload\s*=|document\.cookie|<\s*iframe\b/i.test(s)).length;
      const weakSignals = (/<\s*\w+/i.test(text) ? 1 : 0) + (/on\w+\s*=/i.test(text) ? 1 : 0);
      const confidencePct = confidenceFromRuleMatch({ isAttack, matchedCount: matched.length, strongCount, weakSignals, textLen: text.length });

      const saved = await DetectionHistory.create({
        userId: req.user.id,
        inputType: "text",
        input: text.slice(0, 500),
        finalResult,
        ruleResult: isAttack ? matched.slice(0, 4).join(" | ") : "—",
        mlResult: "—",
        confidence: confidencePct, // ✅ percent
        signals: isAttack ? ["xss_pattern_match"] : ["xss_no_match"],
      });

      return res.json({ result: saved });
    }

    // ---- Fallback ----
    const fallback = String(input || "");
    if (fallback.trim().length < 3) return res.status(400).json({ message: "Input is required" });

    const saved = await DetectionHistory.create({
      userId: req.user.id,
      inputType: String(inputType || "text"),
      input: fallback.slice(0, 500),
      finalResult: "SAFE",
      ruleResult: "—",
      mlResult: "—",
      confidence: 50, // ✅ percent
      signals: ["not_supported_attack"],
    });

    return res.json({
      result: {
        _id: saved._id,
        inputType: saved.inputType,
        input: saved.input,
        finalResult: saved.finalResult,
        ruleResult: saved.ruleResult,
        mlResult: saved.mlResult,
        confidence: saved.confidence,
        signals: saved.signals,
        createdAt: saved.createdAt,
      },
    });

  } catch (err) {
    console.error("Detect error:", err);
    return res.status(500).json({ message: "Detection failed" });
  } finally {
    const ms = Date.now() - startedAt;
    if (ms > ML_TIMEOUT_MS) {
      // no-op
    }
  }
});

// ===== RESET HISTORY =====
router.delete("/reset-history", auth, async (req, res) => {
  try {
    await DetectionHistory.deleteMany({ userId: req.user.id });
    return res.json({ message: "History reset successfully" });
  } catch {
    return res.status(500).json({ message: "Reset failed" });
  }
});

module.exports = router;