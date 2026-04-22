import os
import json
import pandas as pd
from joblib import dump
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier

BASE = os.path.dirname(__file__)
RAW = os.path.join(BASE, "data_raw")
MODELS = os.path.join(BASE, "models")
os.makedirs(MODELS, exist_ok=True)

RANDOM_STATE = 42

def _save(pipe, name: str):
    path = os.path.join(MODELS, name)
    dump(pipe, path)
    return path

def _train_binary(texts, labels, *, analyzer="word", ngram_range=(1,2), max_features=60000):
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer=analyzer,
            ngram_range=ngram_range,
            min_df=2,
            max_df=0.98,
            max_features=max_features,
            stop_words="english" if analyzer=="word" else None
        )),
        ("clf", SGDClassifier(
            loss="log_loss",
            max_iter=25,
            tol=1e-3,
            random_state=RANDOM_STATE
        ))
    ])
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.15, random_state=RANDOM_STATE, stratify=labels
    )
    pipe.fit(X_train, y_train)
    acc = float((pipe.predict(X_test) == y_test).mean())
    return pipe, acc

def train_spam():
    # spam.csv: v1 label (ham/spam), v2 text
    path = os.path.join(RAW, "spam", "spam.csv")
    df = pd.read_csv(path, encoding="latin-1")
    df = df[["v1","v2"]].rename(columns={"v1":"label","v2":"text"})
    df["label"] = df["label"].astype(str).str.lower().map({"spam":"SPAM","ham":"SAFE"}).fillna("SAFE")
    df["text"] = df["text"].astype(str).fillna("")
    df = df[df["text"].str.len() > 3].reset_index(drop=True)

    pipe, acc = _train_binary(df["text"], df["label"], analyzer="word", ngram_range=(1,2), max_features=50000)
    out = _save(pipe, "spam_text.joblib")
    return {"model": out, "accuracy": acc, "rows": int(len(df))}

def train_phishing_url():
    # malicious_phish_sample.csv: url + type (benign/phishing/malware/defacement)
    path = os.path.join(RAW, "malware", "malicious_phish_sample.csv")
    df = pd.read_csv(path)
    df = df[["url","type"]].rename(columns={"url":"text","type":"raw"})
    df["raw"] = df["raw"].astype(str).str.lower()
    df["label"] = df["raw"].apply(lambda x: "PHISHING" if x=="phishing" else ("SAFE" if x=="benign" else None))
    df = df.dropna(subset=["label","text"])
    df["text"] = df["text"].astype(str).fillna("")
    # sample to keep training fast
    if len(df) > 60000:
        df = df.sample(60000, random_state=RANDOM_STATE).reset_index(drop=True)

    pipe, acc = _train_binary(df["text"], df["label"], analyzer="char", ngram_range=(3,5), max_features=80000)
    out = _save(pipe, "phishing_url.joblib")
    return {"model": out, "accuracy": acc, "rows": int(len(df))}

def train_malware_file():
    # We train on strings; for malware we use malware URLs as malicious examples and benign URLs as safe.
    path = os.path.join(RAW, "malware", "malicious_phish_sample.csv")
    df = pd.read_csv(path)
    df = df[["url","type"]].rename(columns={"url":"text","type":"raw"})
    df["raw"] = df["raw"].astype(str).str.lower()
    df["label"] = df["raw"].apply(lambda x: "MALWARE" if x=="malware" else ("SAFE" if x=="benign" else None))
    df = df.dropna(subset=["label","text"])
    df["text"] = df["text"].astype(str).fillna("")
    if len(df) > 60000:
        df = df.sample(60000, random_state=RANDOM_STATE).reset_index(drop=True)

    pipe, acc = _train_binary(df["text"], df["label"], analyzer="char", ngram_range=(3,6), max_features=90000)
    out = _save(pipe, "malware_file.joblib")
    return {"model": out, "accuracy": acc, "rows": int(len(df))}

def main():
    results = {
        "spam": train_spam(),
        "phishing_url": train_phishing_url(),
        "malware_file": train_malware_file(),
    }
    print(json.dumps({"ok": True, "results": results}, ensure_ascii=False))

if __name__ == "__main__":
    main()
