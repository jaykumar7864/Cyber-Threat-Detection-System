// Rule-based detector for 8 cyber attacks.
// Returns { ruleResult, signals[] }

const ATTACKS = {
  SAFE: "SAFE",
  PHISHING: "PHISHING",
  MALWARE: "MALWARE",
  SPAM: "SPAM",
  DDOS: "DDOS",
  SQLI: "SQL_INJECTION",
  XSS: "XSS",
  BRUTE_FORCE: "BRUTE_FORCE",
  RANSOMWARE: "RANSOMWARE"
};

function normalize(s) {
  return (s || "").toLowerCase();
}

function detectRules({ inputType, input }) {
  const text = normalize(input);
  const signals = [];

  // Phishing
  if (/(verify|urgent|account|password|otp|bank|kyc|login)/.test(text) && /(http|https|bit\.ly|tinyurl)/.test(text)) {
    signals.push("phishing_keywords+link");
    return { ruleResult: ATTACKS.PHISHING, signals };
  }
  if (/paypal|upi|netbanking|card\s?details|cvv/.test(text) && /(click|tap|open)/.test(text)) {
    signals.push("payment_credentials_prompt");
    return { ruleResult: ATTACKS.PHISHING, signals };
  }

  // Malware
  if (/(\.exe|\.apk|\.scr|\.bat|\.cmd|\.js|\.vbs|\.jar)\b/.test(text) && /(download|install|setup)/.test(text)) {
    signals.push("suspicious_file_extension");
    return { ruleResult: ATTACKS.MALWARE, signals };
  }
  if (/trojan|keylogger|spyware|worm|backdoor/.test(text)) {
    signals.push("malware_terms");
    return { ruleResult: ATTACKS.MALWARE, signals };
  }

  // Spam
  if (/(free|winner|congratulations|offer|limited time|claim now|100% free)/.test(text)) {
    signals.push("spam_promo_keywords");
    return { ruleResult: ATTACKS.SPAM, signals };
  }

  // DDoS
  if (/(ddos|flood|botnet|syn flood|udp flood)/.test(text)) {
    signals.push("ddos_terms");
    return { ruleResult: ATTACKS.DDOS, signals };
  }

  // SQL Injection
  if (/(' or 1=1|union select|drop table|--\s|;\s*drop|information_schema)/.test(text)) {
    signals.push("sqli_signature");
    return { ruleResult: ATTACKS.SQLI, signals };
  }

  // XSS
  if (/(<script|onerror=|onload=|javascript:|document\.cookie)/.test(text)) {
    signals.push("xss_signature");
    return { ruleResult: ATTACKS.XSS, signals };
  }

  // Brute Force
  if (/(bruteforce|password spraying|credential stuffing)/.test(text)) {
    signals.push("bruteforce_terms");
    return { ruleResult: ATTACKS.BRUTE_FORCE, signals };
  }

  // Ransomware
  if (/(ransom|decrypt|bitcoin|your files are encrypted|pay to unlock)/.test(text)) {
    signals.push("ransomware_terms");
    return { ruleResult: ATTACKS.RANSOMWARE, signals };
  }

  return { ruleResult: ATTACKS.SAFE, signals };
}

module.exports = { ATTACKS, detectRules };
