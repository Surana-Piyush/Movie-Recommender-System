"""
Incremental TMDB Dataset Update Script
======================================
Fetches newly released movies from TMDB API (now playing / recent releases),
appends missing movies to TMDB_movie_dataset.csv, generates embeddings ONLY
for the new movies (takes ~2 seconds!), and incrementally updates FAISS index.

Run this script weekly or on a scheduled cron job to keep your recommendations fresh!
"""

import os
import re
import time
from pathlib import Path
import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
import faiss
from sentence_transformers import SentenceTransformer

from config import TMDB_API_KEY, TMDB_BASE_URL

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

CSV_FILE = DATA_DIR / "TMDB_movie_dataset.csv"
EMBEDDINGS_FILE = BASE_DIR / "movie_embeddings.npy"
FAISS_FILE = BASE_DIR / "faiss_index.bin"

# HTTP session with retries
session = requests.Session()
adapter = HTTPAdapter(max_retries=3, pool_connections=10, pool_maxsize=20)
session.mount("https://", adapter)
session.mount("http://", adapter)


def fetch_recent_tmdb_movies(max_pages: int = 5) -> list[dict]:
    """Fetch recent & trending movies from TMDB API."""
    print("Fetching latest releases from TMDB API...")
    recent_movies = []
    
    headers = {"accept": "application/json"}
    
    # 1. Fetch Now Playing
    url_now_playing = f"{TMDB_BASE_URL}/movie/now_playing"
    for page in range(1, max_pages + 1):
        try:
            res = session.get(url_now_playing, params={"api_key": TMDB_API_KEY, "page": page}, headers=headers, timeout=10)
            if res.status_code == 200:
                recent_movies.extend(res.json().get("results", []))
        except Exception as e:
            print(f"Note fetching page {page}: {e}")
            
    # 2. Fetch Popular Releases
    url_popular = f"{TMDB_BASE_URL}/movie/popular"
    for page in range(1, max_pages + 1):
        try:
            res = session.get(url_popular, params={"api_key": TMDB_API_KEY, "page": page}, headers=headers, timeout=10)
            if res.status_code == 200:
                recent_movies.extend(res.json().get("results", []))
        except Exception as e:
            pass

    return recent_movies


def sync_latest():
    if not CSV_FILE.exists() or not EMBEDDINGS_FILE.exists() or not FAISS_FILE.exists():
        print("Error: Base dataset files missing. Run build_filtered_dataset.py first.")
        return

    df = pd.read_csv(CSV_FILE)
    existing_ids = set(df["id"].dropna().astype(int))
    
    raw_recent = fetch_recent_tmdb_movies(max_pages=5)
    
    # Deduplicate & filter new movies
    new_movie_dicts = []
    seen_ids = set()
    
    for m in raw_recent:
        m_id = m.get("id")
        if not m_id or m_id in existing_ids or m_id in seen_ids:
            continue
            
        overview = m.get("overview", "")
        vote_count = m.get("vote_count", 0)
        release_date = m.get("release_date", "")
        
        # Apply quality checks
        if not overview or vote_count < 1 or not release_date:
            continue
            
        seen_ids.add(m_id)
        
        # Build dataset row matching CSV format
        new_movie_dicts.append({
            "id": m_id,
            "title": m.get("title", ""),
            "vote_average": m.get("vote_average", 0.0),
            "vote_count": vote_count,
            "status": "Released",
            "release_date": release_date,
            "revenue": 0,
            "runtime": 0,
            "adult": False,
            "backdrop_path": m.get("backdrop_path", ""),
            "budget": 0,
            "homepage": "",
            "imdb_id": "",
            "original_language": m.get("original_language", "en"),
            "original_title": m.get("original_title", ""),
            "overview": overview,
            "popularity": m.get("popularity", 0.0),
            "poster_path": m.get("poster_path", ""),
            "tagline": "",
            "genres": "",
            "production_companies": "",
            "production_countries": "",
            "spoken_languages": m.get("original_language", "en"),
            "keywords": "",
        })

    if not new_movie_dicts:
        print("[OK] Dataset is up to date! No new movies to add.")
        return

    print(f"\nFound {len(new_movie_dicts)} new movies to add!")
    
    df_new = pd.DataFrame(new_movie_dicts)
    
    # 1. Update CSV
    df_updated = pd.concat([df, df_new], ignore_index=True)
    df_updated.to_csv(CSV_FILE, index=False)
    print(f"[OK] Appended {len(df_new)} new movies to {CSV_FILE.name}")
    
    # 2. Encode ONLY the new movies (Takes ~1-2 seconds!)
    movie_texts = (
        df_new["title"].fillna("") + " " +
        df_new["overview"].fillna("") + " " +
        df_new["tagline"].fillna("")
    ).tolist()
    
    print(f"Encoding {len(movie_texts)} new movies using SentenceTransformer...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    new_embeddings = model.encode(movie_texts, batch_size=64, convert_to_numpy=True)
    
    # 3. Append to existing embeddings matrix
    old_embeddings = np.load(EMBEDDINGS_FILE)
    combined_embeddings = np.vstack([old_embeddings, new_embeddings])
    np.save(EMBEDDINGS_FILE, combined_embeddings)
    print(f"[OK] Appended new vectors to {EMBEDDINGS_FILE.name} (Total: {len(combined_embeddings):,})")
    
    # 4. Incrementally add vectors to FAISS index
    print("Updating FAISS index...")
    faiss_index = faiss.read_index(str(FAISS_FILE))
    
    new_emb_f32 = new_embeddings.astype(np.float32).copy()
    faiss.normalize_L2(new_emb_f32)
    faiss_index.add(new_emb_f32)
    
    faiss.write_index(faiss_index, str(FAISS_FILE))
    print(f"[OK] FAISS index updated! Total vectors: {faiss_index.ntotal:,}")
    print("\n[OK] Sync Complete! New releases are now live in your recommender engine.")


if __name__ == "__main__":
    sync_latest()
