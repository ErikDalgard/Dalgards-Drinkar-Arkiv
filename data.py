"""
Converts fredagsdrinken_mall.xlsx into data.json for the website.

Usage:
    python3 build_data.py

Run this again every time you add rows to the spreadsheet, then
re-upload data.json next to index.html.
"""
import json
import pandas as pd

BASE_URL = "https://pub-d688f8858d1642c38d005fae0305bb3c.r2.dev"
SPREADSHEET = "fredagsdrinken_mall.csv"
OUTPUT = "data.json"

df = pd.read_csv(SPREADSHEET)
df = df.dropna(subset=["Filnamn"])

videos = []
for _, row in df.iterrows():
    videos.append({
        "date": str(row["Datum"]).split(" ")[0],
        "theme": str(row["Tema"]).strip(),
        "drink": str(row["Drink"]).strip(),
        "note": str(row.get("Kommentar", "") or "").strip(),
        "url": f"{BASE_URL}/{row['Filnamn']}",
        "ingredients": str(row.get("Ingridienser", "") or "").strip(),
        "steps": str(row.get("Instruktioner", "") or "").strip(),    
        })

videos.sort(key=lambda v: v["date"], reverse=True)

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(videos, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(videos)} videos to {OUTPUT}")