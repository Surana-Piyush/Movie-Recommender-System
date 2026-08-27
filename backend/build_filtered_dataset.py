"""
Clean & Build Filtered Recommendation Dataset
=============================================
Filters:
  1. vote_count >= 5
  2. Non-empty overview
  3. release_date between 1950 and 2026

Produces aligned:
  - backend/data/TMDB_movie_dataset.csv (~50 MB)
  - backend/movie_embeddings.npy (~173 MB)
  - backend/faiss_index.bin (~173 MB)
"""

import os
import time
from pathlib import Path
import numpy as np
import pandas as pd
import faiss
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

CSV_FILE = DATA_DIR / "TMDB_movie_dataset.csv"
EMBEDDINGS_FILE = BASE_DIR / "movie_embeddings.npy"
FAISS_FILE = BASE_DIR / "faiss_index.bin"


def sizeof(path: Path) -> str:
    size = os.path.getsize(path)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


print("=" * 60)
print("STEP 1 -- Filtering TMDB Dataset")
print("=" * 60)

df = pd.read_csv(CSV_FILE)
original_count = len(df)
print(f"Current movies in CSV: {original_count:,}")

# Filter 1: release_date between 1950 and 2026
df["_year"] = pd.to_datetime(df["release_date"], errors="coerce").dt.year
mask_year = (df["_year"] >= 1950) & (df["_year"] <= 2026)

# Filter 2: Non-empty overview
mask_overview = df["overview"].notna() & (df["overview"].str.strip() != "")

# Filter 3: vote_count >= 5
mask_votes = df["vote_count"] >= 5

final_mask = mask_year & mask_overview & mask_votes
df_filtered = df[final_mask].drop(columns=["_year"]).reset_index(drop=True)

removed_count = original_count - len(df_filtered)
print(f"  - Removed low engagement (vote_count < 5)")
print(f"  - Removed empty overviews")
print(f"  - Removed release dates outside 1950-2026")
print(f"\n[OK] Kept: {len(df_filtered):,} quality movies | Removed: {removed_count:,}")

# Save filtered CSV
df_filtered.to_csv(CSV_FILE, index=False)
print(f"[OK] Filtered CSV saved -> {sizeof(CSV_FILE)}")


print("\n" + "=" * 60)
print("STEP 2 -- Generating Fresh Embeddings")
print("=" * 60)

text_columns = ["title", "overview", "tagline", "genres", "keywords"]
for col in text_columns:
    if col in df_filtered.columns:
        df_filtered[col] = df_filtered[col].fillna("")

movie_texts = (
    df_filtered["title"] + " " +
    df_filtered["overview"] + " " +
    df_filtered["tagline"] + " " +
    df_filtered["genres"] + " " +
    df_filtered["keywords"]
).tolist()

print(f"Encoding {len(movie_texts):,} movies using all-MiniLM-L6-v2...")

model = SentenceTransformer("all-MiniLM-L6-v2")

t0 = time.time()
embeddings = model.encode(
    movie_texts,
    batch_size=256,
    show_progress_bar=True,
    convert_to_numpy=True,
)
elapsed = time.time() - t0

np.save(EMBEDDINGS_FILE, embeddings)
print(f"\n[OK] Embeddings generated in {elapsed/60:.1f} minutes")
print(f"[OK] Embeddings saved -> {sizeof(EMBEDDINGS_FILE)}")


print("\n" + "=" * 60)
print("STEP 3 -- Rebuilding FAISS Index")
print("=" * 60)

embeddings_f32 = embeddings.astype(np.float32).copy()
faiss.normalize_L2(embeddings_f32)

dim = embeddings_f32.shape[1]
nlist = max(int(np.sqrt(len(embeddings_f32))), 100)

quantizer = faiss.IndexFlatIP(dim)
index = faiss.IndexIVFFlat(quantizer, dim, nlist, faiss.METRIC_INNER_PRODUCT)

index.train(embeddings_f32)
index.add(embeddings_f32)

faiss.write_index(index, str(FAISS_FILE))
print(f"[OK] FAISS index built with {index.ntotal:,} vectors")
print(f"[OK] FAISS index saved -> {sizeof(FAISS_FILE)}")


print("\n" + "=" * 60)
print("SUMMARY & HOSTING READINESS")
print("=" * 60)
print(f"  Filtered Movies: {len(df_filtered):,}")
print(f"  CSV Size:        {sizeof(CSV_FILE)}")
print(f"  Embeddings Size: {sizeof(EMBEDDINGS_FILE)}")
print(f"  FAISS Index Size:{sizeof(FAISS_FILE)}")
total_mb = sum(os.path.getsize(f) for f in [CSV_FILE, EMBEDDINGS_FILE, FAISS_FILE]) / (1024**2)
print(f"  Total Data Size: ~{total_mb:.1f} MB")
print("  Render RAM requirement: ~250 MB (Fits Free Tier 512 MB easily!)")
print("=" * 60)
