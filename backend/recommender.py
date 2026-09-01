import os
from typing import Dict, List

import numpy as np
import pandas as pd
import torch
from scipy.sparse import csr_matrix
from sentence_transformers import SentenceTransformer, util
from sklearn.neighbors import NearestNeighbors
from pathlib import Path

from config import IMAGE_BASE_URL, BACKDROP_BASE_URL

# ==========================================================
# Configuration
# ==========================================================

ALPHA = 0.7
TOP_K = 50

# ==========================================================
# Load TMDB Dataset
# ==========================================================

print("Loading TMDB dataset...")



BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# Auto-download missing dataset & vector embedding files from GitHub Release on deployment startup
REMOTE_DATASET_FILES = {
    DATA_DIR / "rating.csv": "https://github.com/Surana-Piyush/Movie-Recommender-System/releases/download/v.1.0.0/rating.csv",
    BASE_DIR / "movie_embeddings.npy": "https://github.com/Surana-Piyush/Movie-Recommender-System/releases/download/v.1.0.0/movie_embeddings.npy",
    BASE_DIR / "faiss_index.bin": "https://github.com/Surana-Piyush/Movie-Recommender-System/releases/download/v.1.0.0/faiss_index.bin",
}

for _local_path, _remote_url in REMOTE_DATASET_FILES.items():
    if not _local_path.exists():
        print(f"Downloading missing file {_local_path.name} from GitHub Release...")
        try:
            import urllib.request
            _local_path.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(_remote_url, _local_path)
            print(f"Successfully downloaded {_local_path.name}")
        except Exception as _e:
            print(f"Warning: Failed to download {_local_path.name}: {_e}")

df = pd.read_csv(DATA_DIR / "TMDB_movie_dataset.csv")
movie_df = pd.read_csv(DATA_DIR / "movie.csv")
rating_df = pd.read_csv(DATA_DIR / "rating.csv")
EMBEDDING_FILE = BASE_DIR / "movie_embeddings.npy" if (BASE_DIR / "movie_embeddings.npy").exists() else DATA_DIR / "movie_embeddings.npy"

# df = pd.read_csv("TMDB_movie_dataset.csv")

drop_columns = [
    "adult",
    "status",
    "revenue",
    "budget",
    "homepage",
    "original_title",
    "production_companies",
    "production_countries",
    "spoken_languages",
]

existing_drop_columns = [c for c in drop_columns if c in df.columns]
df = df.drop(columns=existing_drop_columns)

text_columns = [
    "title",
    "overview",
    "tagline",
    "genres",
    "keywords",
]

df[text_columns] = df[text_columns].fillna("")
df = df.dropna(subset=["title"])

df["movie_text"] = (
    df["title"]
    + " "
    + df["overview"]
    + " "
    + df["tagline"]
    + " "
    + df["genres"]
    + " "
    + df["keywords"]
)

# ==========================================================
# Embedding Model
# ==========================================================

print("Loading SentenceTransformer model...")

try:
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
except Exception:
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# ==========================================================
# Movie Embeddings
# ==========================================================

# EMBEDDING_FILE = "movie_embeddings.npy"

if os.path.exists(EMBEDDING_FILE):
    print("Loading saved embeddings...")
    embeddings = np.load(EMBEDDING_FILE)
    min_len = min(len(embeddings), len(df))
    embeddings = embeddings[:min_len]
    df = df.iloc[:min_len]
else:
    print("Generating embeddings...")
    embeddings = embedding_model.encode(
        df["movie_text"].tolist(),
        batch_size=64,
        show_progress_bar=True,
    )
    np.save(EMBEDDING_FILE, embeddings)

# Keep torch tensor for any remaining legacy code
movie_embeddings = torch.tensor(
    embeddings,
    dtype=torch.float32
)

print(f"Loaded {len(movie_embeddings)} movie embeddings.")

# ==========================================================
# FAISS Approximate Nearest Neighbor Index
# ==========================================================

import faiss

FAISS_INDEX_FILE = BASE_DIR / "faiss_index.bin"
EMBEDDING_DIM = embeddings.shape[1]  # 384 for all-MiniLM-L6-v2

# Normalize embeddings for cosine similarity (inner product on L2-normed vectors)
embeddings_f32 = embeddings.astype(np.float32).copy()
faiss.normalize_L2(embeddings_f32)

if os.path.exists(FAISS_INDEX_FILE):
    print("Loading saved FAISS index...")
    faiss_index = faiss.read_index(str(FAISS_INDEX_FILE))
    print(f"FAISS index loaded: {faiss_index.ntotal} vectors.")
else:
    print("Building FAISS IVF index (one-time operation)...")

    # IVF with flat inner-product quantizer
    # nlist = number of Voronoi cells; sqrt(n) is a good starting point
    nlist = int(np.sqrt(len(embeddings_f32)))
    nlist = max(nlist, 100)  # minimum 100 cells

    quantizer = faiss.IndexFlatIP(EMBEDDING_DIM)
    faiss_index = faiss.IndexIVFFlat(
        quantizer, EMBEDDING_DIM, nlist, faiss.METRIC_INNER_PRODUCT
    )

    print(f"  Training IVF with {nlist} cells on {len(embeddings_f32)} vectors...")
    faiss_index.train(embeddings_f32)

    print("  Adding vectors to index...")
    faiss_index.add(embeddings_f32)

    faiss.write_index(faiss_index, str(FAISS_INDEX_FILE))
    print(f"  FAISS index saved to {FAISS_INDEX_FILE}")

# Number of cells to probe at query time (higher = better recall, slower)
faiss_index.nprobe = 40

print(f"FAISS index ready: {faiss_index.ntotal} vectors, dim={EMBEDDING_DIM}")

# ==========================================================
# Weighted Rating
# ==========================================================

C = df["vote_average"].mean()
m = df["vote_count"].quantile(0.90)


def weighted_rating(row):

    v = row["vote_count"]
    R = row["vote_average"]

    return (
        (v / (v + m)) * R
        + (m / (v + m)) * C
    )


df["weighted_rating"] = df.apply(
    weighted_rating,
    axis=1,
)

wr_min = df["weighted_rating"].min()
wr_max = df["weighted_rating"].max()

if wr_max > wr_min:

    df["weighted_rating_norm"] = (
        (df["weighted_rating"] - wr_min)
        / (wr_max - wr_min)
    )

else:

    df["weighted_rating_norm"] = 0.0

# ==========================================================
# Lookup Dictionaries
# ==========================================================

print("Building lookup dictionaries...")

title_to_index = {}
tmdb_id_to_index = {}

for idx, title in zip(df.index, df["title"]):
    if pd.notna(title):
        lower = str(title).strip().lower()
        if lower not in title_to_index:
            title_to_index[lower] = idx

if "id" in df.columns:
    for idx, tmdb_id in zip(df.index, df["id"]):
        if pd.notna(tmdb_id):
            try:
                tmdb_id_to_index[int(tmdb_id)] = idx
            except (ValueError, TypeError):
                pass

# ==========================================================
# Load MovieLens Dataset
# ==========================================================

print("Loading MovieLens dataset...")

# movie_df = pd.read_csv("movie.csv")
# rating_df = pd.read_csv("rating.csv")

title_to_id = dict(
    zip(movie_df["title"], movie_df["movieId"])
)

id_to_title = dict(
    zip(movie_df["movieId"], movie_df["title"])
)

# ==========================================================
# Sparse Matrix
# ==========================================================

user_to_idx = {
    u: i
    for i, u in enumerate(
        rating_df["userId"].unique()
    )
}

movie_to_idx = {
    m: i
    for i, m in enumerate(
        rating_df["movieId"].unique()
    )
}

idx_to_movie = {
    i: m
    for m, i in movie_to_idx.items()
}

rows = rating_df["movieId"].map(movie_to_idx)
cols = rating_df["userId"].map(user_to_idx)

movie_user_matrix = csr_matrix(
    (
        rating_df["rating"],
        (rows, cols),
    )
)

# ==========================================================
# KNN Model
# ==========================================================

print("Training collaborative filtering model...")

knn_model = NearestNeighbors(
    metric="cosine",
    algorithm="brute",
)

knn_model.fit(movie_user_matrix)

print("Recommender initialized successfully.")

def format_movie_dict(idx: int, score: float = 0.0) -> dict:
    """Format a dataframe row into a complete Movie dict instantly without external API calls."""
    row = df.iloc[idx]

    poster = row.get("poster_path")
    backdrop = row.get("backdrop_path")

    poster_url = None
    if pd.notna(poster) and str(poster).strip():
        p_str = str(poster).strip()
        poster_url = p_str if p_str.startswith("http") else f"{IMAGE_BASE_URL}{p_str if p_str.startswith('/') else '/' + p_str}"

    backdrop_url = None
    if pd.notna(backdrop) and str(backdrop).strip():
        b_str = str(backdrop).strip()
        backdrop_url = b_str if b_str.startswith("http") else f"{BACKDROP_BASE_URL}{b_str if b_str.startswith('/') else '/' + b_str}"

    tmdb_id = int(row["id"]) if ("id" in row and pd.notna(row["id"])) else int(idx)

    return {
        "tmdb_id": tmdb_id,
        "title": str(row["title"]),
        "overview": str(row["overview"]) if pd.notna(row.get("overview")) else "",
        "release_date": str(row["release_date"]) if pd.notna(row.get("release_date")) else "",
        "rating": round(float(row["vote_average"]), 1) if pd.notna(row.get("vote_average")) else 0.0,
        "poster": poster_url,
        "backdrop": backdrop_url,
        "score": round(float(score), 4),
    }

def get_movie_by_id(tmdb_id: int) -> Dict | None:
    """Instantly lookup a movie from local dataset by its TMDB ID."""
    if tmdb_id in tmdb_id_to_index:
        idx = tmdb_id_to_index[tmdb_id]
        return format_movie_dict(idx)
    return None

# ==========================================================
# Semantic Search (FAISS-accelerated)
# ==========================================================

def semantic_search(
    query: str,
    top_k: int = TOP_K,
    language: str | None = None,
) -> List[Dict]:

    """
    Search movies using semantic similarity via FAISS ANN index.
    Supports optional language filtering (e.g. 'hi', 'en').
    """

    query = query.strip()

    if not query:
        return []

    # Encode user query to numpy, normalize for cosine similarity
    query_vec = embedding_model.encode(
        query,
        convert_to_numpy=True,
    ).astype(np.float32).reshape(1, -1)
    faiss.normalize_L2(query_vec)

    # Retrieve candidates from FAISS (increase headroom if filtering by language)
    multiplier = 30 if language else 4
    n_candidates = min(top_k * multiplier, faiss_index.ntotal)
    similarities, candidate_indices = faiss_index.search(query_vec, n_candidates)

    sim_scores = similarities[0]        # shape: (n_candidates,)
    cand_indices = candidate_indices[0]  # shape: (n_candidates,)

    # Re-rank: blend FAISS cosine similarity with weighted rating
    wr_values = df["weighted_rating_norm"].values
    final_scores = (
        ALPHA * sim_scores
        + (1 - ALPHA) * wr_values[cand_indices]
    )

    # Sort candidates by blended score descending
    ranked_order = np.argsort(final_scores)[::-1]

    results = []
    for rank_pos in ranked_order:
        idx = int(cand_indices[rank_pos])

        if language:
            movie_lang = str(df.iloc[idx].get("original_language", "")).lower()
            if movie_lang != language.lower():
                continue

        results.append(format_movie_dict(idx, final_scores[rank_pos]))

        if len(results) == top_k:
            break

    return results

# ==========================================================
# Similar Movie Search (FAISS-accelerated)
# ==========================================================

def similar_movie(
    movie_title: str,
    top_k: int = TOP_K,
    language: str | None = None,
) -> List[Dict]:

    """
    Recommend movies similar to a given movie via FAISS ANN index.
    Supports optional language filtering and fuzzy/substring/semantic fallback matching.
    """

    clean_title = movie_title.strip().lower()

    if not clean_title:
        return []

    # 1. Exact match lookup
    match_idx = title_to_index.get(clean_title)

    # 2. Substring / prefix match lookup for autocomplete or partial terms
    if match_idx is None:
        for t_lower, idx in title_to_index.items():
            if clean_title in t_lower or t_lower.startswith(clean_title):
                match_idx = idx
                break

    # 3. Fallback to semantic search if title is not indexed
    if match_idx is None:
        return semantic_search(movie_title, top_k=top_k, language=language)

    # Get its normalized embedding for FAISS lookup
    loc = df.index.get_loc(match_idx)
    search_vec = embeddings_f32[loc].reshape(1, -1).copy()

    # Retrieve candidates from FAISS (extra headroom for filtering + re-ranking)
    multiplier = 30 if language else 4
    n_candidates = min((top_k + 1) * multiplier, faiss_index.ntotal)
    similarities, candidate_indices = faiss_index.search(search_vec, n_candidates)

    sim_scores = similarities[0]
    cand_indices = candidate_indices[0]

    # Re-rank: blend similarity with weighted rating
    wr_values = df["weighted_rating_norm"].values
    final_scores = (
        ALPHA * sim_scores
        + (1 - ALPHA) * wr_values[cand_indices]
    )

    # Sort candidates by blended score descending
    ranked_order = np.argsort(final_scores)[::-1]

    results = []
    for rank_pos in ranked_order:
        idx = int(cand_indices[rank_pos])
        title = df.iloc[idx]["title"]

        # Don't recommend the exact same movie
        if title.lower() == clean_title:
            continue

        if language:
            movie_lang = str(df.iloc[idx].get("original_language", "")).lower()
            if movie_lang != language.lower():
                continue

        results.append(format_movie_dict(idx, final_scores[rank_pos]))

        if len(results) == top_k:
            break

    return results

# ==========================================================
# Personalized Recommendations
# ==========================================================

def recommend_movies(
    my_ratings: Dict[str, float],
    top_n: int = TOP_K,
    neighbours: int = 20,
    language: str | None = None,
) -> List[Dict]:
    """
    Generate personalized recommendations using collaborative filtering.
    Supports optional language filtering.
    """

    if not my_ratings:
        return []

    scores = {}
    similarity_sum = {}

    watched_movies = set(my_ratings.keys())

    for movie_title, user_rating in my_ratings.items():

        if movie_title not in title_to_id:
            continue

        movie_id = title_to_id[movie_title]

        if movie_id not in movie_to_idx:
            continue

        movie_index = movie_to_idx[movie_id]

        distances, indices = knn_model.kneighbors(
            movie_user_matrix[movie_index],
            n_neighbors=neighbours,
        )

        for distance, neighbour_index in zip(
            distances[0][1:],
            indices[0][1:],
        ):

            similarity = 1 - distance

            neighbour_movie_id = idx_to_movie[neighbour_index]

            if neighbour_movie_id not in id_to_title:
                continue

            neighbour_title = id_to_title[neighbour_movie_id]

            if neighbour_title in watched_movies:
                continue

            scores[neighbour_title] = (
                scores.get(neighbour_title, 0)
                + similarity * user_rating
            )

            similarity_sum[neighbour_title] = (
                similarity_sum.get(neighbour_title, 0)
                + similarity
            )

    recommendations = []

    for movie in scores:

        final_score = (
            scores[movie]
            / similarity_sum[movie]
        )

        if movie.lower() in title_to_index:
            idx = title_to_index[movie.lower()]
            if language:
                movie_lang = str(df.iloc[idx].get("original_language", "")).lower()
                if movie_lang != language.lower():
                    continue

            recommendations.append(format_movie_dict(idx, final_score))

    recommendations.sort(
        key=lambda x: x["score"],
        reverse=True,
    )

    return recommendations[:top_n]