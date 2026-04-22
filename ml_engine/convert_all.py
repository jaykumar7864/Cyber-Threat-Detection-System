import os, glob
import pandas as pd

BASE = os.path.dirname(__file__)
RAW = os.path.join(BASE, "data_raw")
OUT = os.path.join(BASE, "data_ready")
os.makedirs(OUT, exist_ok=True)

def read_any(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in [".xlsx", ".xls"]:
        return pd.read_excel(path)
    return pd.read_csv(path, encoding="latin-1")

def convert_spam():
    files = glob.glob(os.path.join(RAW, "spam", "*.csv")) + glob.glob(os.path.join(RAW, "spam", "*.xlsx"))
    if not files:
        print("❌ Spam file not found in data_raw/spam/")
        return None

    df = read_any(files[0])
    df = df.iloc[:, :2]
    df.columns = ["label", "text"]
    df["label"] = df["label"].astype(str).str.lower().map({"spam": "SPAM", "ham": "SAFE"})
    df["text"] = df["text"].astype(str)
    df = df.dropna(subset=["label", "text"])
    out_path = os.path.join(OUT, "spam_final.csv")
    df[["text","label"]].to_csv(out_path, index=False)
    print("✅ spam_final.csv created")
    return df[["text","label"]]

def convert_phishing():
    files = glob.glob(os.path.join(RAW, "phishing", "*.csv")) + glob.glob(os.path.join(RAW, "phishing", "*.xlsx"))
    if not files:
        print("❌ Phishing files not found in data_raw/phishing/")
        return None

    frames = []
    for f in files:
        df = read_any(f)
        df.columns = [str(c).lower().strip() for c in df.columns]

        if "label" not in df.columns:
            continue

        # Always make them Series (not strings)
        subject = df["subject"].astype(str) if "subject" in df.columns else pd.Series([""] * len(df))
        body    = df["body"].astype(str)    if "body" in df.columns    else pd.Series([""] * len(df))
        urls    = df["urls"].astype(str)    if "urls" in df.columns    else pd.Series([""] * len(df))

        text = (subject + " " + body + " " + urls).astype(str).str.strip()

        lab = df["label"].astype(str).str.strip().map({"1": "PHISHING", "0": "SAFE"}).fillna("SAFE")

        out = pd.DataFrame({"text": text, "label": lab})
        out = out[out["text"].str.len() > 3]
        frames.append(out)

    if not frames:
        print("❌ No phishing rows converted. Check columns: subject/body/label")
        return None

    final = pd.concat(frames, ignore_index=True)
    out_path = os.path.join(OUT, "phishing_final.csv")
    final.to_csv(out_path, index=False)
    print("✅ phishing_final.csv created")
    return final


def convert_malware():
    files = glob.glob(os.path.join(RAW, "malware", "*.csv")) + glob.glob(os.path.join(RAW, "malware", "*.xlsx"))
    if not files:
        print("❌ Malware files not found in data_raw/malware/")
        return None

    frames = []
    for f in files:
        df = read_any(f)
        df.columns = [str(c).lower().strip() for c in df.columns]

        url_col = None
        for c in df.columns:
            if "url" in c:
                url_col = c
                break

        label_col = None
        for c in df.columns:
            if c in ["type", "label", "class", "result"]:
                label_col = c
                break

        if url_col is None or label_col is None:
            continue

        text = df[url_col].astype(str)
        raw = df[label_col].astype(str).str.upper()

        def map_lab(x):
            x = str(x).upper()
            if "MALWARE" in x: return "MALWARE"
            if "PHISH" in x: return "PHISHING"
            if "BENIGN" in x or "SAFE" in x: return "SAFE"
            if "SPAM" in x: return "SPAM"
            return "MALWARE"

        lab = raw.apply(map_lab)
        out = pd.DataFrame({"text": text, "label": lab})
        out = out[out["text"].str.len() > 3]
        frames.append(out)

    if not frames:
        print("❌ No malware rows converted. Check columns: url/type")
        return None

    final = pd.concat(frames, ignore_index=True)
    out_path = os.path.join(OUT, "malware_final.csv")
    final.to_csv(out_path, index=False)
    print("✅ malware_final.csv created")
    return final

def main():
    spam = convert_spam()
    phishing = convert_phishing()
    malware = convert_malware()

    all_frames = [x for x in [spam, phishing, malware] if x is not None]
    if not all_frames:
        print("❌ Nothing converted.")
        return

    merged = pd.concat(all_frames, ignore_index=True).dropna()
    merged_path = os.path.join(OUT, "merged_dataset.csv")
    merged.to_csv(merged_path, index=False)
    print("✅ merged_dataset.csv created")

if __name__ == "__main__":
    main()
