export function checkPasswordStrength(password) {
  const s = String(password || "");
  let score = 0;

  if (s.length >= 8) score += 1;
  if (s.length >= 12) score += 1;
  if (/[A-Z]/.test(s)) score += 1;
  if (/[a-z]/.test(s)) score += 1;
  if (/[0-9]/.test(s)) score += 1;
  if (/[^A-Za-z0-9]/.test(s)) score += 1;

  if (/^(1234|12345|123456|password|qwerty|admin)/i.test(s)) score = Math.max(0, score - 2);
  if (/(\w)\1\1/.test(s)) score = Math.max(0, score - 1);

  if (score >= 5) return "STRONG";
  if (score >= 3) return "MEDIUM";
  return "WEAK";
}
