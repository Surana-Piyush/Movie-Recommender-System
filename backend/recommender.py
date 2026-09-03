import os
import sys
import threading
import sqlite3
import urllib.request
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import numpy as np
import pandas as pd

from config import IMAGE_BASE_URL, BACKDROP_BASE_URL

# ==========================================================
# Configuration
# ==========================================================

ALPHA = 0.7
TOP_K = 50
EMBEDDING_DIM = 384

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
METADATA_DB_PATH = DATA_DIR / "movies_metadata.db"
KNN_COMPACT_PATH = DATA_DIR / "knn_compact.npz"
MODEL_ONNX_DIR = BASE_DIR / "model_onnx"
MODEL_ONNX_PATH = MODEL_ONNX_DIR / "model.onnx"
TOKENIZER_PATH = MODEL_ONNX_DIR / "tokenizer.json"

# ==========================================================
# Lazy Loading State Globals
# ==========================================================

_is_loaded = False
_load_lock = threading.Lock()

embeddings_mmap: Optional[np.ndarray] = None
wr_norm: Optional[np.ndarray] = None
languages: Optional[np.ndarray] = None

onnx_session = None
tokenizer = None

title_to_index: Dict[str, int] = {}
tmdb_id_to_index: Dict[int, int] = {}
title_to_id: Dict[str, int] = {}
id_to_title: Dict[int, str] = {}

# Compact MovieLens KNN
knn_movie_to_row: Dict[int, int] = {}
knn_nbr_ids: Optional[np.ndarray] = None
knn_nbr_sims: Optional[np.ndarray] = None


def _get_db_connection() -> sqlite3.Connection:
    """Thread-local / per-call lightweight SQLite connection."""
    conn = sqlite3.connect(str(METADATA_DB_PATH), check_same_thread=False)
    return conn


def _ensure_recommender_loaded():
    """
    Lazy load ultra-lightweight ML resources (ONNX Runtime, Tokenizers, Compact KNN, SQLite Metadata)
    exactly ONCE on first demand using a thread lock to keep application startup instant
    and memory usage well below Render's 512 MB limit.
    """
    global _is_loaded, embeddings_mmap, wr_norm, languages, onnx_session, tokenizer
    global title_to_index, tmdb_id_to_index, title_to_id, id_to_title
    global knn_movie_to_row, knn_nbr_ids, knn_nbr_sims

    if _is_loaded:
        return

    with _load_lock:
        if _is_loaded:
            return

        print("=" * 65)
        print("[RECOMMENDER LOG] Initializing ultra-lightweight ONNX recommendation engine...")
        print("=" * 65)

        # 1. Download missing external assets (model.onnx, movie_embeddings.npy)
        if not MODEL_ONNX_PATH.exists():
            print("[RECOMMENDER LOG] Downloading ONNX model (~90 MB) from HuggingFace...")
            MODEL_ONNX_DIR.mkdir(parents=True, exist_ok=True)
            try:
                urllib.request.urlretrieve(
                    "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx",
                    MODEL_ONNX_PATH
                )
                print("[RECOMMENDER LOG] Successfully downloaded model.onnx")
            except Exception as _e:
                print(f"[RECOMMENDER LOG] Error downloading model.onnx: {_e}")

        EMBEDDING_FILE = BASE_DIR / "movie_embeddings.npy" if (BASE_DIR / "movie_embeddings.npy").exists() else DATA_DIR / "movie_embeddings.npy"
        if not EMBEDDING_FILE.exists():
            print("[RECOMMENDER LOG] Downloading movie_embeddings.npy (~165 MB) from GitHub Release...")
            try:
                urllib.request.urlretrieve(
                    "https://github.com/Surana-Piyush/Movie-Recommender-System/releases/download/v.1.0.0/movie_embeddings.npy",
                    EMBEDDING_FILE
                )
                print("[RECOMMENDER LOG] Successfully downloaded movie_embeddings.npy")
            except Exception as _e:
                print(f"[RECOMMENDER LOG] Error downloading movie_embeddings.npy: {_e}")

        # 2. Build or Verify SQLite Metadata Database (Saves ~150 MB RAM vs Pandas in-memory)
        if not METADATA_DB_PATH.exists():
            print("[RECOMMENDER LOG] Creating SQLite metadata cache from TMDB dataset...")
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            usecols = [
                "id", "title", "vote_average", "vote_count",
                "poster_path", "backdrop_path", "overview", "release_date", "original_language"
            ]
            raw_df = pd.read_csv(DATA_DIR / "TMDB_movie_dataset.csv", usecols=usecols)
            raw_df["overview"] = raw_df["overview"].fillna("")
            raw_df["poster_path"] = raw_df["poster_path"].fillna("")
            raw_df["backdrop_path"] = raw_df["backdrop_path"].fillna("")
            raw_df["release_date"] = raw_df["release_date"].fillna("")
            raw_df["original_language"] = raw_df["original_language"].fillna("en")

            conn = sqlite3.connect(str(METADATA_DB_PATH))
            raw_df.to_sql("movies", conn, if_exists="replace", index=True, index_label="row_idx")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_row ON movies(row_idx)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_tmdb_id ON movies(id)")
            conn.close()
            del raw_df

        # 3. Load In-Memory Ranking Index (Lightweight: ~10 MB RAM)
        print("[RECOMMENDER LOG] Indexing titles and weighted ratings...")
        conn = _get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT row_idx, id, title, vote_average, vote_count, original_language FROM movies ORDER BY row_idx ASC")
        rows = cur.fetchall()
        conn.close()

        n_movies = len(rows)
        row_indices = []
        ids = np.zeros(n_movies, dtype=np.int32)
        v_counts = np.zeros(n_movies, dtype=np.float32)
        v_avgs = np.zeros(n_movies, dtype=np.float32)
        lang_list = []

        title_to_index.clear()
        tmdb_id_to_index.clear()

        for i, (r_idx, t_id, title_str, v_avg, v_cnt, lang_str) in enumerate(rows):
            row_indices.append(r_idx)
            ids[i] = int(t_id) if t_id is not None else r_idx
            v_counts[i] = float(v_cnt) if v_cnt is not None else 0.0
            v_avgs[i] = float(v_avg) if v_avg is not None else 0.0
            lang_list.append(str(lang_str).lower() if lang_str else "en")

            if title_str:
                t_lower = str(title_str).strip().lower()
                if t_lower not in title_to_index:
                    title_to_index[t_lower] = r_idx

            if t_id is not None:
                tmdb_id_to_index[int(t_id)] = r_idx

        languages = np.array(lang_list)

        # Compute weighted rating norm array
        C = float(np.mean(v_avgs))
        m = float(np.quantile(v_counts, 0.90))
        wr = ((v_counts / (v_counts + m)) * v_avgs) + ((m / (v_counts + m)) * C)
        wr_min = float(np.min(wr))
        wr_max = float(np.max(wr))
        if wr_max > wr_min:
            wr_norm = ((wr - wr_min) / (wr_max - wr_min)).astype(np.float32)
        else:
            wr_norm = np.zeros(n_movies, dtype=np.float32)

        # 4. Load Memory-Mapped Embeddings (Clean file-backed pages, ~0 MB anonymous heap)
        print(f"[RECOMMENDER LOG] Memory-mapping movie embeddings ({EMBEDDING_FILE.name})...")
        embeddings_mmap = np.load(EMBEDDING_FILE, mmap_mode="r")
        if len(embeddings_mmap) > n_movies:
            embeddings_mmap = embeddings_mmap[:n_movies]

        # 5. Load MovieLens Metadata and Compact Precomputed KNN (~1.6 MB on disk, ~6 MB in RAM)
        movie_csv_path = DATA_DIR / "movie.csv"
        if movie_csv_path.exists():
            movie_df = pd.read_csv(movie_csv_path)
            title_to_id.clear()
            id_to_title.clear()
            title_to_id.update(dict(zip(movie_df["title"], movie_df["movieId"])))
            id_to_title.update(dict(zip(movie_df["movieId"], movie_df["title"])))
            del movie_df

        if KNN_COMPACT_PATH.exists():
            print("[RECOMMENDER LOG] Loading compact MovieLens KNN lookup...")
            knn_data = np.load(KNN_COMPACT_PATH)
            knn_movie_ids = knn_data["ids"]
            knn_nbr_ids = knn_data["nbrs"]
            knn_nbr_sims = knn_data["sims"]
            knn_movie_to_row.clear()
            knn_movie_to_row.update({int(mid): i for i, mid in enumerate(knn_movie_ids)})
            print(f"[RECOMMENDER LOG] Loaded {len(knn_movie_to_row)} MovieLens KNN neighbor graphs.")
        else:
            print("[RECOMMENDER LOG] Warning: knn_compact.npz not found. Falling back to content-based recommendations.")

        # 6. Initialize ONNX Runtime Session & Tokenizer (~40 MB RAM)
        print("[RECOMMENDER LOG] Initializing ONNX Runtime inference session...")
        import onnxruntime as ort
        from tokenizers import Tokenizer

        tokenizer = Tokenizer.from_file(str(TOKENIZER_PATH))
        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = 1
        sess_options.inter_op_num_threads = 1
        sess_options.enable_cpu_mem_arena = False
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        onnx_session = ort.InferenceSession(
            str(MODEL_ONNX_PATH),
            sess_options,
            providers=["CPUExecutionProvider"]
        )

        _is_loaded = True
        print("[RECOMMENDER LOG] Ultra-lightweight recommendation engine loaded successfully!")
        print("=" * 65)


def _encode_query(query: str) -> np.ndarray:
    """
    Encode a search query string into a 384-dimensional unit vector using ONNX Runtime.
    Numerically identical to SentenceTransformer('all-MiniLM-L6-v2') at ~15% the RAM usage.
    """
    clean_query = query.strip()[:256]
    encoded = tokenizer.encode(clean_query)

    input_ids = np.array([encoded.ids], dtype=np.int64)
    attention_mask = np.array([encoded.attention_mask], dtype=np.int64)
    token_type_ids = np.array([encoded.type_ids], dtype=np.int64)

    outputs = onnx_session.run(None, {
        "input_ids": input_ids,
        "attention_mask": attention_mask,
        "token_type_ids": token_type_ids,
    })

    last_hidden_state = outputs[0]

    # Mean Pooling
    mask_expanded = np.expand_dims(attention_mask, -1).astype(np.float32)
    sum_embeddings = np.sum(last_hidden_state * mask_expanded, axis=1)
    sum_mask = np.clip(mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
    mean_pooled = sum_embeddings / sum_mask

    # L2 Normalization
    norm = np.linalg.norm(mean_pooled, axis=1, keepdims=True)
    unit_vec = (mean_pooled / np.maximum(norm, 1e-9))[0].astype(np.float32)
    return unit_vec


def _build_movie_dict(
    tmdb_id: int,
    title: str,
    overview: str,
    release_date: str,
    rating: float,
    poster: Optional[str],
    backdrop: Optional[str],
    score: float = 0.0,
) -> dict:
    poster_url = None
    if poster and str(poster).strip():
        p_str = str(poster).strip()
        poster_url = p_str if p_str.startswith("http") else f"{IMAGE_BASE_URL}{p_str if p_str.startswith('/') else '/' + p_str}"

    backdrop_url = None
    if backdrop and str(backdrop).strip():
        b_str = str(backdrop).strip()
        backdrop_url = b_str if b_str.startswith("http") else f"{BACKDROP_BASE_URL}{b_str if b_str.startswith('/') else '/' + b_str}"

    return {
        "tmdb_id": int(tmdb_id),
        "title": str(title) if title else "Unknown",
        "overview": str(overview) if overview else "",
        "release_date": str(release_date) if release_date else "",
        "rating": round(float(rating), 1) if rating is not None else 0.0,
        "poster": poster_url,
        "backdrop": backdrop_url,
        "score": round(float(score), 4),
    }


def format_movie_dict(idx: int, score: float = 0.0) -> dict:
    """Format a movie dict by fetching metadata from SQLite in <0.5ms."""
    _ensure_recommender_loaded()
    conn = _get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, title, overview, release_date, vote_average, poster_path, backdrop_path FROM movies WHERE row_idx = ?", (int(idx),))
    row = cur.fetchone()
    conn.close()

    if not row:
        return {"tmdb_id": int(idx), "title": "Unknown", "score": round(float(score), 4)}

    t_id, title, overview, rel_date, vote_avg, poster, backdrop = row
    return _build_movie_dict(t_id if t_id is not None else idx, title, overview, rel_date, vote_avg, poster, backdrop, score)


def format_movies_batch(items: List[Tuple[int, float]]) -> List[dict]:
    """Batch-fetch metadata for multiple movies in a single SQLite query (0.3ms)."""
    if not items:
        return []
    _ensure_recommender_loaded()

    idx_to_score = {idx: score for idx, score in items}
    indices = list(idx_to_score.keys())

    conn = _get_db_connection()
    cur = conn.cursor()
    placeholders = ",".join("?" * len(indices))
    cur.execute(
        f"SELECT row_idx, id, title, overview, release_date, vote_average, poster_path, backdrop_path FROM movies WHERE row_idx IN ({placeholders})",
        indices
    )
    rows = cur.fetchall()
    conn.close()

    row_dict = {
        r[0]: _build_movie_dict(r[1] if r[1] is not None else r[0], r[2], r[3], r[4], r[5], r[6], r[7], idx_to_score.get(r[0], 0.0))
        for r in rows
    }

    # Preserve original score-ranked order
    results = []
    for idx, score in items:
        if idx in row_dict:
            results.append(row_dict[idx])

    return results


def get_movie_by_id(tmdb_id: int) -> Optional[Dict]:
    """Instantly lookup a movie from SQLite by its TMDB ID."""
    _ensure_recommender_loaded()
    conn = _get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, title, overview, release_date, vote_average, poster_path, backdrop_path FROM movies WHERE id = ? LIMIT 1",
        (int(tmdb_id),)
    )
    row = cur.fetchone()
    conn.close()

    if row:
        t_id, title, overview, rel_date, vote_avg, poster, backdrop = row
        return _build_movie_dict(t_id, title, overview, rel_date, vote_avg, poster, backdrop, 0.0)
    return None


# ==========================================================
# Semantic Search (NumPy Vector Dot-Product)
# ==========================================================

def semantic_search(
    query: str,
    top_k: int = TOP_K,
    language: str | None = None,
) -> List[Dict]:
    """
    Search movies using exact cosine similarity via NumPy vector dot product.
    Runs in <15ms with 0 MB FAISS memory overhead.
    """
    query = query.strip()
    if not query:
        return []

    _ensure_recommender_loaded()

    query_vec = _encode_query(query)
    sim_scores = np.dot(embeddings_mmap, query_vec)
    final_scores = (ALPHA * sim_scores + (1.0 - ALPHA) * wr_norm)

    multiplier = 30 if language else 1
    n_candidates = min(top_k * multiplier, len(final_scores))
    part_indices = np.argpartition(final_scores, -n_candidates)[-n_candidates:]
    ranked_order = part_indices[np.argsort(-final_scores[part_indices])]

    items = []
    for idx in ranked_order:
        idx = int(idx)
        if language and languages is not None:
            if languages[idx] != language.lower():
                continue

        items.append((idx, float(final_scores[idx])))
        if len(items) == top_k:
            break

    return format_movies_batch(items)


# ==========================================================
# Similar Movie Search (NumPy Vector Dot-Product)
# ==========================================================

def similar_movie(
    movie_title: str,
    top_k: int = TOP_K,
    language: str | None = None,
) -> List[Dict]:
    """
    Recommend movies similar to a given movie via exact vector similarity.
    Supports optional language filtering and fuzzy/substring/semantic fallback matching.
    """
    clean_title = movie_title.strip().lower()
    if not clean_title:
        return []

    _ensure_recommender_loaded()

    match_idx = title_to_index.get(clean_title)

    if match_idx is None:
        for t_lower, idx in title_to_index.items():
            if clean_title in t_lower or t_lower.startswith(clean_title):
                match_idx = idx
                break

    if match_idx is None:
        return semantic_search(movie_title, top_k=top_k, language=language)

    search_vec = embeddings_mmap[match_idx]

    sim_scores = np.dot(embeddings_mmap, search_vec)
    final_scores = (ALPHA * sim_scores + (1.0 - ALPHA) * wr_norm)

    multiplier = 30 if language else 1
    n_candidates = min((top_k + 5) * multiplier, len(final_scores))
    part_indices = np.argpartition(final_scores, -n_candidates)[-n_candidates:]
    ranked_order = part_indices[np.argsort(-final_scores[part_indices])]

    items = []
    for idx in ranked_order:
        idx = int(idx)
        if idx == match_idx:
            continue

        if language and languages is not None:
            if languages[idx] != language.lower():
                continue

        items.append((idx, float(final_scores[idx])))
        if len(items) == top_k:
            break

    return format_movies_batch(items)


# ==========================================================
# Personalized Recommendations (Hybrid Precomputed KNN + Vectors)
# ==========================================================

def _find_dataset_index_by_title(raw_title: str) -> Optional[int]:
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
    via compact precomputed MovieLens KNN graphs and content-based vector embedding profile modeling.
    """
    _ensure_recommender_loaded()

    if not my_ratings:
        top_indices = np.argsort(-wr_norm)[:top_n]
        items = [(int(idx), 0.90) for idx in top_indices]
        return format_movies_batch(items)

    collab_scores: Dict[int, float] = {}
    collab_weights: Dict[int, float] = {}
    vector_scores: Dict[int, float] = {}

    watched_df_indices = set()
    watched_titles_lower = {t.strip().lower() for t in my_ratings.keys()}

    user_vector = np.zeros(EMBEDDING_DIM, dtype=np.float32)
    vector_weight_total = 0.0

    for movie_title, user_rating in my_ratings.items():
        # Content Profile Vector
        idx = _find_dataset_index_by_title(movie_title)
        if idx is not None:
            watched_df_indices.add(idx)
            weight = float(user_rating) - 2.5
            if weight != 0:
                user_vector += weight * embeddings_mmap[idx]
                vector_weight_total += abs(weight)

        # Collaborative Filtering via Compact Precomputed KNN
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

        if ml_movie_id and ml_movie_id in knn_movie_to_row and knn_nbr_ids is not None:
            row_idx = knn_movie_to_row[ml_movie_id]
            nbr_ids_row = knn_nbr_ids[row_idx][:neighbours]
            nbr_sims_row = knn_nbr_sims[row_idx][:neighbours]
            user_rating_norm = float(user_rating) / 5.0

            for neighbour_movie_id, similarity in zip(nbr_ids_row, nbr_sims_row):
                neighbour_movie_id = int(neighbour_movie_id)
                similarity = float(similarity)
                if neighbour_movie_id in id_to_title:
                    n_title = id_to_title[neighbour_movie_id]
                    n_idx = title_to_index.get(n_title.lower())
                    if n_idx is not None and n_idx not in watched_df_indices:
                        collab_scores[n_idx] = collab_scores.get(n_idx, 0.0) + (similarity * user_rating_norm)
                        collab_weights[n_idx] = collab_weights.get(n_idx, 0.0) + similarity

    # Vector Profile Search
    if vector_weight_total > 0 and np.linalg.norm(user_vector) > 0:
        norm = np.linalg.norm(user_vector)
        user_vector = user_vector / np.maximum(norm, 1e-9)

        sims = np.dot(embeddings_mmap, user_vector)
        n_candidates = min((top_n + 15) * 5, len(sims))
        part = np.argpartition(sims, -n_candidates)[-n_candidates:]
        for cand_idx in part:
            cand_idx = int(cand_idx)
            if cand_idx not in watched_df_indices:
                vector_scores[cand_idx] = max(float(sims[cand_idx]), 0.0)

    all_candidate_indices = set(collab_scores.keys()) | set(vector_scores.keys())
    scored_items = []

    for idx in all_candidate_indices:
        if idx in watched_df_indices:
            continue

        if language and languages is not None:
            if languages[idx] != language.lower():
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

        wr_n = float(wr_norm[idx]) if wr_norm is not None else 0.5
        blended = 0.75 * raw_match + 0.25 * wr_n
        final_score = min(max(blended, 0.05), 0.99)
        scored_items.append((idx, final_score))

    scored_items.sort(key=lambda x: x[1], reverse=True)

    if len(scored_items) < top_n and wr_norm is not None:
        top_fallback = np.argsort(-wr_norm)
        existing_indices = {idx for idx, _ in scored_items}
        for f_idx in top_fallback:
            f_idx = int(f_idx)
            if f_idx not in watched_df_indices and f_idx not in existing_indices:
                scored_items.append((f_idx, 0.88))
                existing_indices.add(f_idx)
                if len(scored_items) >= top_n:
                    break

    selected_items = scored_items[:top_n]
    return format_movies_batch(selected_items)