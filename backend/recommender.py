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
TOP_K = 10

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

movie_embeddings = torch.tensor(
    embeddings,
    dtype=torch.float32
)

print(f"Loaded {len(movie_embeddings)} movie embeddings.")

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
# Semantic Search
# ==========================================================

def semantic_search(
    query: str,
    top_k: int = TOP_K,
) -> List[Dict]:

    """
    Search movies using semantic similarity.

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

    # Encode user query
    query_embedding = embedding_model.encode(
        query,
        convert_to_tensor=True,
    )

    # Cosine similarity
    similarities = util.cos_sim(
        query_embedding,
        movie_embeddings,
    )[0]

    # Combine semantic similarity and weighted rating
    final_scores = (
        ALPHA * similarities.cpu().numpy()
        + (1 - ALPHA)
        * df["weighted_rating_norm"].values
    )

    # Highest scores first
    top_indices = np.argsort(final_scores)[::-1]

    results = []

    for idx in top_indices[:top_k]:

        results.append(
            {
                "title": df.iloc[idx]["title"],
                "score": round(
                    float(final_scores[idx]),
                    4,
                ),
            }
        )

    return results

# ==========================================================
# Similar Movie Search
# ==========================================================

def similar_movie(
    movie_title: str,
    top_k: int = TOP_K,
) -> List[Dict]:

    """
    Recommend movies similar to a given movie.

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

    # Find the movie index
    match_idx = title_to_index[movie_title]

    # Get its embedding
    search_embedding = movie_embeddings[
        df.index.get_loc(match_idx)
    ].unsqueeze(0)

    # Cosine similarity
    similarities = util.cos_sim(
        search_embedding,
        movie_embeddings,
    )[0]

    # Blend similarity with weighted rating
    final_scores = (
        ALPHA * similarities.cpu().numpy()
        + (1 - ALPHA)
        * df["weighted_rating_norm"].values
    )

    # Sort descending
    top_indices = np.argsort(final_scores)[::-1]

    results = []

    for idx in top_indices:

        idx = int(idx)

        title = df.iloc[idx]["title"]

        # Don't recommend the same movie
        if title.lower() == movie_title:
            continue

        results.append(
            {
                "title": title,
                "score": round(
                    float(final_scores[idx]),
                    4,
                ),
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