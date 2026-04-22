const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

const PYTHON = process.env.PYTHON_PATH || process.env.PYTHON || "python";
const ML_ENGINE_DIR =
  process.env.ML_ENGINE_DIR ||
  path.resolve(__dirname, "..", "..", "..", "ml_engine");

const PREDICT_SCRIPT = path.join(ML_ENGINE_DIR, "predict.py");

function runPython(args, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, args, {
      cwd: ML_ENGINE_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: process.env,
    });

    let out = "";
    let err = "";

    const killTimer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {}
      reject(new Error("ML engine timeout"));
    }, timeoutMs);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));

    child.on("error", (e) => {
      clearTimeout(killTimer);
      reject(e);
    });

    child.on("close", (code) => {
      clearTimeout(killTimer);
      if (code !== 0) {
        return reject(new Error(err || `ML engine exited with code ${code}`));
      }
      try {
        const json = JSON.parse(out.trim() || "{}");
        resolve(json);
      } catch (e) {
        reject(new Error("Invalid ML response"));
      }
    });
  });
}

async function predictPhishingUrl(url) {
  const res = await runPython([PREDICT_SCRIPT, "--attack", "phishing", "--text", String(url || "")]);
  return res;
}

async function predictSpamText(text) {
  const res = await runPython([PREDICT_SCRIPT, "--attack", "spam", "--text", String(text || "")]);
  return res;
}

async function predictMalwareFile(filePath, fallbackText = "") {
  const args = [PREDICT_SCRIPT, "--attack", "malware"];
  if (filePath) args.push("--file", filePath);
  if (fallbackText) args.push("--text", String(fallbackText));
  const res = await runPython(args, 20000);
  return res;
}

module.exports = {
  predictPhishingUrl,
  predictSpamText,
  predictMalwareFile,
};
