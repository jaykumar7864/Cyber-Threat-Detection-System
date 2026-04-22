

import os
import glob
import pandas as pd
from joblib import dump

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import classification_report, accuracy_score

DATA_DIR = os.path.join(os.path.dirname(__file__), "data_ready")
OUT_DIR = os.path.dirname(__file__)

def load_any_csvs(folder):
    paths = glob.glob(os.path.join(folder, "*.csv"))
    if not paths:
        raise SystemExit(f"No CSV found in {folder}.")
    frames = []
    for p in paths:
        df = pd.read_csv(p)
        if "text" not in df.columns or "label" not in df.columns:
            raise SystemExit(f"CSV must have columns text,label. Problem: {p}")
        frames.append(df[["text", "label"]])
    return pd.concat(frames, ignore_index=True)

def main():
    df = load_any_csvs(DATA_DIR)
    df["text"] = df["text"].astype(str).fillna("")
    df["label"] = df["label"].astype(str).fillna("SAFE")

    # ✅ memory-safe sampling (important)
    if len(df) > 30000:
       df = df.sample(30000, random_state=42).reset_index(drop=True)


    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["label"],
        test_size=0.2,
        random_state=42,
        stratify=df["label"]
    )

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=3,
            max_df=0.9,
            max_features=20000, # ✅ strong limit
            stop_words="english"
        )),
        ("clf", SGDClassifier(
            loss="log_loss",
            max_iter=15,
            tol=1e-3
        ))
    ])

    pipe.fit(X_train, y_train)

    pred = pipe.predict(X_test)
    acc = accuracy_score(y_test, pred)
    print("Accuracy:", round(acc, 4))
    print(classification_report(y_test, pred))

    dump(pipe, os.path.join(OUT_DIR, "model.joblib"))
    print("Saved model to model.joblib ✅")

if __name__ == "__main__":
    main()
