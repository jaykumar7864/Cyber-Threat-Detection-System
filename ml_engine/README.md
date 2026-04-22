# ML Engine (Final Professional)

## 1) Install
pip install -r requirements.txt

## 2) Run API
python app.py
API: http://127.0.0.1:8000/predict

## 3) Train your model (after downloading datasets)
1) Put CSV(s) inside: ml_engine/data/
   Required columns: text,label
   label values: SAFE, PHISHING, MALWARE, SPAM (you can add more too)
2) Run:
   python train.py
3) It will create: model.joblib
4) Restart API:
   python app.py

## Quick demo
We already included a small sample_dataset.csv for testing.
