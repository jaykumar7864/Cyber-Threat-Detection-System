import argparse
import json
import os
import re
from joblib import load

BASE = os.path.dirname(__file__)
MODELS = os.path.join(BASE, "models")

# Optional per-attack models (if present)
PHISHING_MODEL = os.path.join(MODELS, "phishing_url.joblib")
SPAM_MODEL = os.path.join(MODELS, "spam_text.joblib")
MALWARE_MODEL = os.path.join(MODELS, "malware_file.joblib")

# Always-available bundled model (already shipped in project zip)
BUNDLED_MULTI_MODEL = os.path.join(BASE, "model.joblib")

PRINTABLE = re.compile(r"[ -~]{4,}")

# ✅ EICAR signatures (bytes + text)
EICAR_BYTES = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
EICAR_MARKER = "EICAR-STANDARD-ANTIVIRUS-TEST-FILE"


def clean_url(u: str) -> str:
    u = str(u or "").strip().lower()
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\.", "", u)
    u = u.strip("/")
    return u


def contains_eicar(file_path: str, max_bytes: int = 2 * 1024 * 1024) -> bool:
    """
    ✅ Detect EICAR test string reliably.
    Reads up to 2MB (more than enough for eicar_test_file.txt).
    """
    try:
        with open(file_path, "rb") as f:
            data = f.read(max_bytes)
    except Exception:
        return False

    if not data:
        return False

    # Direct byte signature
    if EICAR_BYTES in data:
        return True

    # Text marker fallback (handles small variations/encodings)
    try:
        text = data.decode("latin-1", errors="ignore")
    except Exception:
        text = ""

    return EICAR_MARKER in text


def extract_file_features(path: str, max_bytes: int = 65536) -> str:
    try:
        st = os.stat(path)
        size = st.st_size
    except Exception:
        size = 0

    name = os.path.basename(path)
    ext = os.path.splitext(name)[1].lower()

    buf = b""
    try:
        with open(path, "rb") as f:
            buf = f.read(max_bytes)
    except Exception:
        buf = b""

    ascii_text = " ".join(PRINTABLE.findall(buf.decode("latin-1", errors="ignore")))[:4000]
    header = buf[:32].hex()
    unique = len(set(buf)) if buf else 0

    parts = [
        f"filename={name}",
        f"ext={ext}",
        f"size={size}",
        f"unique_bytes={unique}",
        f"hex_head={header}",
        ascii_text
    ]
    return " ".join([p for p in parts if p]).strip()


def _predict(pipe, text: str):
    label = pipe.predict([text])[0]
    conf = 0.65
    try:
        proba = pipe.predict_proba([text])[0]
        classes = list(pipe.classes_)
        idx = classes.index(label) if label in classes else 0
        conf = float(proba[idx])
    except Exception:
        pass
    return str(label).upper(), float(conf)


def load_attack_model(attack: str):
    # Prefer per-attack models if they exist, else fallback to bundled multi model.
    if attack == "phishing" and os.path.exists(PHISHING_MODEL):
        return load(PHISHING_MODEL)
    if attack == "spam" and os.path.exists(SPAM_MODEL):
        return load(SPAM_MODEL)
    if attack == "malware" and os.path.exists(MALWARE_MODEL):
        return load(MALWARE_MODEL)

    # Fallback
    if not os.path.exists(BUNDLED_MULTI_MODEL):
        raise FileNotFoundError("No ML model found (model.joblib missing).")
    return load(BUNDLED_MULTI_MODEL)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--attack", required=True, choices=["phishing", "spam", "malware"])
    ap.add_argument("--text", default="")
    ap.add_argument("--file", default="")
    args = ap.parse_args()

    text = args.text or ""

    if args.attack == "phishing":
        text = clean_url(text)

    # ✅ Malware: EICAR rule override BEFORE ML
    if args.attack == "malware" and args.file:
        if contains_eicar(args.file):
            print(json.dumps({"label": "MALWARE", "confidence": 0.99}, ensure_ascii=False))
            return
        text = extract_file_features(args.file)

    pipe = load_attack_model(args.attack)
    raw_label, conf = _predict(pipe, text)

    # If using bundled multi-model, normalize to required outputs
    if pipe is not None and (
        not os.path.exists(PHISHING_MODEL)
        and not os.path.exists(SPAM_MODEL)
        and not os.path.exists(MALWARE_MODEL)
    ):
        if args.attack == "phishing":
            label = "PHISHING" if raw_label == "PHISHING" else "SAFE"
        elif args.attack == "spam":
            label = "SPAM" if raw_label == "SPAM" else "SAFE"
        else:
            label = "MALWARE" if raw_label == "MALWARE" else "SAFE"
    else:
        label = raw_label

    print(json.dumps({"label": label, "confidence": conf}, ensure_ascii=False))


if __name__ == "__main__":
    main()