import os
from typing import Dict, List

import numpy as np
import pandas as pd
import torch
from scipy.sparse import csr_matrix
from sentence_transformers import SentenceTransformer, util
from sklearn.neighbors import NearestNeighbors
from pathlib import Path

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

df = pd.read_csv(DATA_DIR / "TMDB_movie_dataset.csv")
movie_df = pd.read_csv(DATA_DIR / "movie.csv")
rating_df = pd.read_csv(DATA_DIR / "rating.csv")
EMBEDDING_FILE = BASE_DIR / "movie_embeddings.npy" if (BASE_DIR / "movie_embeddings.npy").exists() else DATA_DIR / "movie_embeddings.npy"

# df = pd.read_csv("TMDB_movie_dataset.csv")

drop_columns = [
    "backdrop_path",
    "adult",
    "status",
    "revenue",
    "budget",
    "homepage",
    "original_language",
    "original_title",
    "poster_path",
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

for idx, title in zip(df.index, df["title"]):

    lower = title.lower()

    if lower not in title_to_index:
        title_to_index[lower] = idx

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

# ==========================================================
# Semantic Search (FAISS-accelerated)
# ==========================================================

def semantic_search(
    query: str,
    top_k: int = TOP_K,
) -> List[Dict]:

    """
    Search movies using semantic similarity via FAISS ANN index.

    Returns:
        [
            {
                "title": "...",
                "score": 0.93
            },
            ...
        ]
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

    # Retrieve candidates from FAISS (get more than top_k for re-ranking headroom)
    n_candidates = min(top_k * 4, faiss_index.ntotal)
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
    for rank_pos in ranked_order[:top_k]:
        idx = int(cand_indices[rank_pos])
        results.append(
            {
                "title": df.iloc[idx]["title"],
                "score": round(float(final_scores[rank_pos]), 4),
            }
        )

    return results

# ==========================================================
# Similar Movie Search (FAISS-accelerated)
# ==========================================================

def similar_movie(
    movie_title: str,
    top_k: int = TOP_K,
) -> List[Dict]:

    """
    Recommend movies similar to a given movie via FAISS ANN index.

    Returns:
        [
            {
                "title": "...",
                "score": 0.95
            },
            ...
        ]
    """

    movie_title = movie_title.strip().lower()

    if not movie_title:
        return []

    if movie_title not in title_to_index:
        return []

    # Find the movie's position in the dataframe
    match_idx = title_to_index[movie_title]
    loc = df.index.get_loc(match_idx)

    # Get its normalized embedding for FAISS lookup
    search_vec = embeddings_f32[loc].reshape(1, -1).copy()

    # Retrieve candidates from FAISS (extra headroom for filtering + re-ranking)
    n_candidates = min((top_k + 1) * 4, faiss_index.ntotal)
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

        # Don't recommend the same movie
        if title.lower() == movie_title:
            continue

        results.append(
            {
                "title": title,
                "score": round(float(final_scores[rank_pos]), 4),
            }
        )

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
) -> List[Dict]:
    """
    Generate personalized recommendations using collaborative filtering.

    Parameters
    ----------
    my_ratings
        Example:
        {
            "Interstellar (2014)": 5,
            "Inception (2010)": 4.5
        }

    Returns
    -------
        [
            {
                "title": "...",
                "score": 4.81
            }
        ]
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

        recommendations.append(
            {
                "title": movie,
                "score": round(
                    float(final_score),
                    4,
                ),
            }
        )

    recommendations.sort(
        key=lambda x: x["score"],
        reverse=True,
    )

    return recommendations[:top_n]