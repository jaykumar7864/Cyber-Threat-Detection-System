from flask import Flask, request, jsonify
from joblib import load
import os

ATTACKS = [
  "SAFE",
  "PHISHING",
  "MALWARE",
  "SPAM",
  "DDOS",
  "SQL_INJECTION",
  "XSS",
  "BRUTE_FORCE",
  "RANSOMWARE"
]

app = Flask(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.joblib")
_model = None

def load_model():
  global _model
  if _model is not None:
    return _model
  if os.path.exists(MODEL_PATH):
    _model = load(MODEL_PATH)
  return _model

def fallback_predict(text: str):
  t = (text or "").lower()
  # Minimal fallback if model not trained yet
  if "otp" in t or "bank" in t or "verify" in t:
    return ("PHISHING", 0.62)
  if ".exe" in t or ".apk" in t or "install" in t:
    return ("MALWARE", 0.60)
  if "free" in t or "winner" in t or "offer" in t:
    return ("SPAM", 0.58)
  return ("SAFE", 0.55)

@app.route("/", methods=["GET"])
def root():
  return jsonify({"ok": True, "service": "Cyber Threat ML API", "model_loaded": os.path.exists(MODEL_PATH)})

@app.route("/predict", methods=["POST"])
def predict():
  body = request.get_json(silent=True) or {}
  text = str(body.get("text", ""))[:4000]

  model = load_model()
  if model is None:
    label, conf = fallback_predict(text)
    return jsonify({"label": label, "confidence": conf, "mode": "fallback"})

  # Pipeline: tfidf + clf
  proba = None
  label = model.predict([text])[0]
  try:
    # not all models provide predict_proba, but LogisticRegression does
    proba = model.predict_proba([text])[0]
    classes = list(model.classes_)
    idx = classes.index(label) if label in classes else 0
    conf = float(proba[idx])
  except Exception:
    conf = 0.70

  return jsonify({"label": str(label), "confidence": conf, "mode": "model"})

if __name__ == "__main__":
  app.run(host="127.0.0.1", port=8000, debug=False)
