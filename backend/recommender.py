import os
import threading
from typing import Dict, List
from pathlib import Path
import numpy as np
import pandas as pd

from config import IMAGE_BASE_URL, BACKDROP_BASE_URL

# ==========================================================
# Configuration
# ==========================================================

ALPHA = 0.7
TOP_K = 50

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# ==========================================================
# Lazy Loading State Globals
# ==========================================================

_is_loaded = False
_load_lock = threading.Lock()

df: pd.DataFrame | None = None
movie_df: pd.DataFrame | None = None
rating_df: pd.DataFrame | None = None
embedding_model = None
embeddings = None
embeddings_f32 = None
faiss_index = None
knn_model = None

title_to_index: Dict[str, int] = {}
tmdb_id_to_index: Dict[int, int] = {}
title_to_id: Dict[str, int] = {}
id_to_title: Dict[int, str] = {}
user_to_idx: Dict[int, int] = {}
movie_to_idx: Dict[int, int] = {}
idx_to_movie: Dict[int, int] = {}
movie_user_matrix = None
EMBEDDING_DIM = 384


def _ensure_recommender_loaded():
    """
    Lazy load all heavy ML resources (DataFrames, SentenceTransformer, FAISS Index, KNN Matrix)
    exactly ONCE on first demand using a thread lock to keep application startup ultra-lightweight.
    """
    global _is_loaded, df, movie_df, rating_df, embedding_model, embeddings, embeddings_f32
    global faiss_index, knn_model, title_to_index, tmdb_id_to_index, title_to_id, id_to_title
    global user_to_idx, movie_to_idx, idx_to_movie, movie_user_matrix

    if _is_loaded:
        return

    with _load_lock:
        if _is_loaded:
            return

        print("=" * 65)
        print("[RECOMMENDER LOG] Initializing heavy ML recommendation engine (lazy load on first request)...")
        print("=" * 65)

        # 1. Download missing dataset files from GitHub Release if needed
        REMOTE_DATASET_FILES = {
            DATA_DIR / "rating.csv": "https://github.com/Surana-Piyush/Movie-Recommender-System/releases/download/v.1.0.0/rating.csv",
            BASE_DIR / "movie_embeddings.npy": "https://github.com/Surana-Piyush/Movie-Recommender-System/releases/download/v.1.0.0/movie_embeddings.npy",
            BASE_DIR / "faiss_index.bin": "https://github.com/Surana-Piyush/Movie-Recommender-System/releases/download/v.1.0.0/faiss_index.bin",
        }

        for _local_path, _remote_url in REMOTE_DATASET_FILES.items():
            if not _local_path.exists():
                print(f"[RECOMMENDER LOG] Downloading missing file {_local_path.name} from GitHub Release...")
                try:
                    import urllib.request
                    _local_path.parent.mkdir(parents=True, exist_ok=True)
                    urllib.request.urlretrieve(_remote_url, _local_path)
                    print(f"[RECOMMENDER LOG] Successfully downloaded {_local_path.name}")
                except Exception as _e:
                    print(f"[RECOMMENDER LOG] Warning: Failed to download {_local_path.name}: {_e}")

        # 2. Load DataFrames
        print("[RECOMMENDER LOG] Reading dataset CSV files...")
        raw_df = pd.read_csv(DATA_DIR / "TMDB_movie_dataset.csv")
        movie_df = pd.read_csv(DATA_DIR / "movie.csv")
        rating_df = pd.read_csv(DATA_DIR / "rating.csv")

        # Memory optimization: drop unneeded columns
        drop_columns = [
            "adult", "status", "revenue", "budget", "homepage",
            "original_title", "production_companies", "production_countries", "spoken_languages",
        ]
        existing_drop = [c for c in drop_columns if c in raw_df.columns]
        raw_df = raw_df.drop(columns=existing_drop)

        text_columns = ["title", "overview", "tagline", "genres", "keywords"]
        raw_df[text_columns] = raw_df[text_columns].fillna("")
        df = raw_df.dropna(subset=["title"]).copy()

        df["movie_text"] = (
            df["title"] + " " + df["overview"] + " " + df["tagline"] + " " + df["genres"] + " " + df["keywords"]
        )

        # 3. Load Embeddings
        EMBEDDING_FILE = BASE_DIR / "movie_embeddings.npy" if (BASE_DIR / "movie_embeddings.npy").exists() else DATA_DIR / "movie_embeddings.npy"
        if os.path.exists(EMBEDDING_FILE):
            print(f"[RECOMMENDER LOG] Loading saved embeddings ({EMBEDDING_FILE.name})...")
            embeddings_f32 = np.load(EMBEDDING_FILE)
            min_len = min(len(embeddings_f32), len(df))
            embeddings_f32 = embeddings_f32[:min_len].copy()
            df = df.iloc[:min_len].copy()
        else:
            print("[RECOMMENDER LOG] Generating embeddings via SentenceTransformer...")
            from sentence_transformers import SentenceTransformer
            try:
                model_inst = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
            except Exception:
                model_inst = SentenceTransformer("all-MiniLM-L6-v2")
            embeddings_raw = model_inst.encode(df["movie_text"].tolist(), batch_size=64, show_progress_bar=False)
            embeddings_f32 = np.ascontiguousarray(embeddings_raw, dtype=np.float32)
            np.save(EMBEDDING_FILE, embeddings_f32)

        # 4. Load FAISS Index
        import faiss
        FAISS_INDEX_FILE = BASE_DIR / "faiss_index.bin"
        faiss.normalize_L2(embeddings_f32)

        if os.path.exists(FAISS_INDEX_FILE):
            print(f"[RECOMMENDER LOG] Loading saved FAISS index from {FAISS_INDEX_FILE.name}...")
            faiss_index = faiss.read_index(str(FAISS_INDEX_FILE))
            print(f"[RECOMMENDER LOG] FAISS index ready with {faiss_index.ntotal} vectors.")
        else:
            print("[RECOMMENDER LOG] Building FAISS IVF index...")
            nlist = max(int(np.sqrt(len(embeddings_f32))), 100)
            quantizer = faiss.IndexFlatIP(EMBEDDING_DIM)
            faiss_index = faiss.IndexIVFFlat(quantizer, EMBEDDING_DIM, nlist, faiss.METRIC_INNER_PRODUCT)
            faiss_index.train(embeddings_f32)
            faiss_index.add(embeddings_f32)
            faiss.write_index(faiss_index, str(FAISS_INDEX_FILE))

        faiss_index.nprobe = 40

        # 5. Compute Weighted Ratings Norm
        C = df["vote_average"].mean()
        m = df["vote_count"].quantile(0.90)

        def _calc_weighted_rating(row):
            v = row["vote_count"]
            R = row["vote_average"]
            return ((v / (v + m)) * R) + ((m / (v + m)) * C)

        df["weighted_rating"] = df.apply(_calc_weighted_rating, axis=1)
        wr_min = df["weighted_rating"].min()
        wr_max = df["weighted_rating"].max()
        if wr_max > wr_min:
            df["weighted_rating_norm"] = (df["weighted_rating"] - wr_min) / (wr_max - wr_min)
        else:
            df["weighted_rating_norm"] = 0.0

        # 6. Build Lookup Dictionaries
        title_to_index.clear()
        tmdb_id_to_index.clear()
        for idx, title_val in zip(df.index, df["title"]):
            if pd.notna(title_val):
                t_lower = str(title_val).strip().lower()
                if t_lower not in title_to_index:
                    title_to_index[t_lower] = idx

        if "id" in df.columns:
            for idx, t_id in zip(df.index, df["id"]):
                if pd.notna(t_id):
                    try:
                        tmdb_id_to_index[int(t_id)] = idx
                    except (ValueError, TypeError):
                        pass

        # 7. MovieLens KNN
        title_to_id.clear()
        id_to_title.clear()
        title_to_id.update(dict(zip(movie_df["title"], movie_df["movieId"])))
        id_to_title.update(dict(zip(movie_df["movieId"], movie_df["title"])))

        user_to_idx.clear()
        movie_to_idx.clear()
        idx_to_movie.clear()

        user_to_idx.update({u: i for i, u in enumerate(rating_df["userId"].unique())})
        movie_to_idx.update({m: i for i, m in enumerate(rating_df["movieId"].unique())})
        idx_to_movie.update({i: m for m, i in movie_to_idx.items()})

        from scipy.sparse import csr_matrix
        from sklearn.neighbors import NearestNeighbors

        r_rows = rating_df["movieId"].map(movie_to_idx)
        r_cols = rating_df["userId"].map(user_to_idx)
        movie_user_matrix = csr_matrix((rating_df["rating"], (r_rows, r_cols)))

        knn_model = NearestNeighbors(metric="cosine", algorithm="brute")
        knn_model.fit(movie_user_matrix)

        _is_loaded = True
        print("[RECOMMENDER LOG] Heavy ML recommendation engine loaded successfully!")
        print("=" * 65)


def _get_embedding_model():
    global embedding_model
    if embedding_model is None:
        from sentence_transformers import SentenceTransformer
        try:
            embedding_model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return embedding_model


def format_movie_dict(idx: int, score: float = 0.0) -> dict:
    """Format a dataframe row into a complete Movie dict instantly without external API calls."""
    _ensure_recommender_loaded()
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
    _ensure_recommender_loaded()
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

    _ensure_recommender_loaded()
    import faiss

    model = _get_embedding_model()
    query_vec = model.encode(query, convert_to_numpy=True).astype(np.float32).reshape(1, -1)
    faiss.normalize_L2(query_vec)

    multiplier = 30 if language else 4
    n_candidates = min(top_k * multiplier, faiss_index.ntotal)
    similarities, candidate_indices = faiss_index.search(query_vec, n_candidates)

    sim_scores = similarities[0]
    cand_indices = candidate_indices[0]

    wr_values = df["weighted_rating_norm"].values
    final_scores = (ALPHA * sim_scores + (1 - ALPHA) * wr_values[cand_indices])

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

    _ensure_recommender_loaded()
    import faiss

    match_idx = title_to_index.get(clean_title)

    if match_idx is None:
        for t_lower, idx in title_to_index.items():
            if clean_title in t_lower or t_lower.startswith(clean_title):
                match_idx = idx
                break

    if match_idx is None:
        return semantic_search(movie_title, top_k=top_k, language=language)

    loc = df.index.get_loc(match_idx)
    search_vec = embeddings_f32[loc].reshape(1, -1).copy()

    multiplier = 30 if language else 4
    n_candidates = min((top_k + 1) * multiplier, faiss_index.ntotal)
    similarities, candidate_indices = faiss_index.search(search_vec, n_candidates)

    sim_scores = similarities[0]
    cand_indices = candidate_indices[0]

    wr_values = df["weighted_rating_norm"].values
    final_scores = (ALPHA * sim_scores + (1 - ALPHA) * wr_values[cand_indices])

    ranked_order = np.argsort(final_scores)[::-1]

    results = []
    for rank_pos in ranked_order:
        idx = int(cand_indices[rank_pos])
        title = df.iloc[idx]["title"]

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
# Personalized Recommendations (Hybrid Collaborative + FAISS)
# ==========================================================

def _find_dataset_index_by_title(raw_title: str) -> int | None:
    """Helper to flexibly find the dataset row index for a given movie title."""
    if not raw_title:
        return None
    _ensure_recommender_loaded()

    clean = raw_title.strip().lower()
    if clean in title_to_index:
        return title_to_index[clean]

    import re
    title_no_year = re.sub(r"\s*\(\d{4}\)\s*$", "", clean).strip()
    if title_no_year in title_to_index:
        return title_to_index[title_no_year]

    for t_lower, idx in title_to_index.items():
        if title_no_year and (title_no_year in t_lower or t_lower.startswith(title_no_year)):
            return idx

    return None


def recommend_movies(
    my_ratings: Dict[str, float],
    top_n: int = TOP_K,
    neighbours: int = 20,
    language: str | None = None,
) -> List[Dict]:
    """
    Generate personalized recommendations using hybrid collaborative filtering
    and FAISS content-based vector embedding profile modeling.
    """
    _ensure_recommender_loaded()
    import faiss

    if not my_ratings:
        top_indices = df.sort_values(by="weighted_rating", ascending=False).head(top_n).index
        return [format_movie_dict(idx, 0.90) for idx in top_indices]

    collab_scores: Dict[int, float] = {}
    collab_weights: Dict[int, float] = {}
    vector_scores: Dict[int, float] = {}

    watched_df_indices = set()
    watched_titles_lower = {t.strip().lower() for t in my_ratings.keys()}

    user_vector = np.zeros(EMBEDDING_DIM, dtype=np.float32)
    vector_weight_total = 0.0

    for movie_title, user_rating in my_ratings.items():
        idx = _find_dataset_index_by_title(movie_title)
        if idx is not None:
            watched_df_indices.add(idx)
            weight = float(user_rating) - 2.5
            if weight != 0:
                loc = df.index.get_loc(idx)
                user_vector += weight * embeddings_f32[loc]
                vector_weight_total += abs(weight)

        movie_title_clean = movie_title.strip()
        import re
        clean_no_year = re.sub(r"\s*\(\d{4}\)\s*$", "", movie_title_clean).strip().lower()

        ml_movie_id = None
        if movie_title_clean in title_to_id:
            ml_movie_id = title_to_id[movie_title_clean]
        else:
            for m_t, m_id in title_to_id.items():
                if clean_no_year and clean_no_year in m_t.lower():
                    ml_movie_id = m_id
                    break

        if ml_movie_id and ml_movie_id in movie_to_idx:
            movie_index = movie_to_idx[ml_movie_id]
            distances, indices = knn_model.kneighbors(
                movie_user_matrix[movie_index],
                n_neighbors=neighbours,
            )
            user_rating_norm = float(user_rating) / 5.0
            for distance, neighbour_index in zip(distances[0][1:], indices[0][1:]):
                similarity = max(1.0 - distance, 0.0)
                neighbour_movie_id = idx_to_movie[neighbour_index]
                if neighbour_movie_id in id_to_title:
                    n_title = id_to_title[neighbour_movie_id]
                    n_idx = title_to_index.get(n_title.lower())
                    if n_idx is not None and n_idx not in watched_df_indices:
                        collab_scores[n_idx] = collab_scores.get(n_idx, 0.0) + (similarity * user_rating_norm)
                        collab_weights[n_idx] = collab_weights.get(n_idx, 0.0) + similarity

    if vector_weight_total > 0 and np.linalg.norm(user_vector) > 0:
        faiss.normalize_L2(user_vector.reshape(1, -1))
        n_candidates = min((top_n + 15) * 5, faiss_index.ntotal)
        sims, cand_indices = faiss_index.search(user_vector.reshape(1, -1), n_candidates)

        for sim, cand_idx in zip(sims[0], cand_indices[0]):
            cand_idx = int(cand_idx)
            if cand_idx not in watched_df_indices:
                vector_scores[cand_idx] = max(float(sim), 0.0)

    all_candidate_indices = set(collab_scores.keys()) | set(vector_scores.keys())
    recommendations = []

    for idx in all_candidate_indices:
        title = df.iloc[idx]["title"]
        if title.strip().lower() in watched_titles_lower:
            continue

        if language:
            movie_lang = str(df.iloc[idx].get("original_language", "")).lower()
            if movie_lang != language.lower():
                continue

        c_score = None
        if idx in collab_scores and collab_weights.get(idx, 0) > 0:
            c_score = collab_scores[idx] / collab_weights[idx]

        v_score = vector_scores.get(idx)

        if c_score is not None and v_score is not None:
            raw_match = 0.5 * c_score + 0.5 * v_score
        elif v_score is not None:
            raw_match = v_score
        elif c_score is not None:
            raw_match = c_score
        else:
            raw_match = 0.5

        wr_norm = float(df.iloc[idx].get("weighted_rating_norm", 0.5))
        blended = 0.75 * raw_match + 0.25 * wr_norm
        final_score = min(max(blended, 0.05), 0.99)

        recommendations.append(format_movie_dict(idx, final_score))

    recommendations.sort(key=lambda x: x["score"], reverse=True)

    if len(recommendations) < top_n:
        existing_ids = {r["tmdb_id"] for r in recommendations}
        for idx in df.sort_values(by="weighted_rating", ascending=False).index:
            if idx not in watched_df_indices:
                m_dict = format_movie_dict(idx, 0.88)
                if m_dict["tmdb_id"] not in existing_ids:
                    recommendations.append(m_dict)
                    existing_ids.add(m_dict["tmdb_id"])
                    if len(recommendations) >= top_n:
                        break

    return recommendations[:top_n]