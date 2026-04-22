const { ATTACKS } = require("./rules");

// Simple fusion: if either says SAFE and the other says attack -> attack.
// If both different attacks -> prefer rule (more strict), unless ML confidence >=0.75.
function fuse(ruleResult, mlResult, confidence = 0) {
  if (!mlResult) return ruleResult;

  if (ruleResult === ATTACKS.SAFE && mlResult !== ATTACKS.SAFE) return mlResult;
  if (mlResult === ATTACKS.SAFE && ruleResult !== ATTACKS.SAFE) return ruleResult;

  if (ruleResult === mlResult) return ruleResult;

  if (confidence >= 0.75) return mlResult;
  return ruleResult;
}

module.exports = { fuse };
