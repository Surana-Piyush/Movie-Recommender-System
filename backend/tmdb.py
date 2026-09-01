import re
import requests
from requests.adapters import HTTPAdapter
from functools import lru_cache
from config import (TMDB_API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL, BACKDROP_BASE_URL)

tmdb_base_url = TMDB_BASE_URL
tmdb_api = TMDB_API_KEY

# Persistent HTTP session with connection pool
_session = requests.Session()
_adapter = HTTPAdapter(pool_connections=30, pool_maxsize=50)
_session.mount("https://", _adapter)
_session.mount("http://", _adapter)


def warmup_tmdb_session():
    """Pre-warm HTTP/HTTPS connection pool to TMDB API."""
    try:
        url = f"{tmdb_base_url}/configuration"
        _session.get(url, params={"api_key": tmdb_api}, timeout=3)
        print("TMDB HTTP session pre-warmed successfully.")
    except Exception as e:
        print(f"TMDB session pre-warm note: {e}")


# ==========================================================
# Cache Statistics (for debugging / monitoring)
# ==========================================================

_cache_stats = {"hits": 0, "misses": 0}

def get_cache_stats():
    """Return current cache hit/miss statistics."""
    return {
        "title_cache_info": getDetails.cache_info()._asdict(),
        "id_cache_info": getDetailsById.cache_info()._asdict(),
        **_cache_stats,
    }


# ==========================================================
# Helpers
# ==========================================================

def format_image_url(base_url: str, path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        path = "/" + path
    return base_url + path


def _build_movie_dict(movie: dict, fallback_title: str = "") -> dict:
    """Convert a raw TMDB API movie object into our standard response dict."""
    return {
        "tmdb_id": movie["id"],
        "title": movie.get("title", fallback_title),
        "overview": movie.get("overview", ""),
        "release_date": movie.get("release_date", ""),
        "rating": movie.get("vote_average", 0.0),
        "poster": format_image_url(IMAGE_BASE_URL, movie.get("poster_path")),
        "backdrop": format_image_url(BACKDROP_BASE_URL, movie.get("backdrop_path")),
    }


# ==========================================================
# Cached TMDB Lookups
# ==========================================================

@lru_cache(maxsize=10_000)
def getDetails(movieName: str) -> dict | None:
    """
    Search TMDB for a movie by title string.
    Results are cached in memory (LRU, up to 10,000 entries).
    """
    match = re.search(r'\((\d{4})\)', movieName)
    year = match.group(1) if match else None
    clean_query = re.sub(r'\s*\(\d{4}\)\s*$', '', movieName).strip()

    url = f"{tmdb_base_url}/search/movie"

    params = {
        "api_key": tmdb_api,
        "query": clean_query
    }
    if year:
        params["primary_release_year"] = year

    results = None
    try:
        response = _session.get(url, params=params, timeout=5)
        if response.status_code == 200:
            results = response.json().get("results")
    except Exception:
        pass

    if not results and year:
        # Fallback search without year restriction
        params.pop("primary_release_year", None)
        try:
            response = _session.get(url, params=params, timeout=5)
            if response.status_code == 200:
                results = response.json().get("results")
        except Exception:
            pass

    if not results and clean_query != movieName:
        # Fallback search with raw original movieName string
        params["query"] = movieName
        try:
            response = _session.get(url, params=params, timeout=5)
            if response.status_code == 200:
                results = response.json().get("results")
        except Exception:
            pass

    if results:
        return _build_movie_dict(results[0], fallback_title=movieName)

    # Local dataset fallback if TMDB API failed or returned no results
    try:
        from recommender import title_to_index, format_movie_dict
        clean_lower = movieName.strip().lower()
        if clean_lower in title_to_index:
            return format_movie_dict(title_to_index[clean_lower])
        for t_lower, idx in title_to_index.items():
            if clean_lower in t_lower:
                return format_movie_dict(idx)
    except Exception:
        pass

    return None


@lru_cache(maxsize=5_000)
def getDetailsById(tmdb_id: int) -> dict | None:
    """
    Fetch movie details directly by TMDB ID.
    Results are cached in memory (LRU, up to 5,000 entries).
    """
    url = f"{tmdb_base_url}/movie/{tmdb_id}"

    params = {
        "api_key": tmdb_api
    }

    try:
        response = _session.get(url, params=params, timeout=2)
        if response.status_code == 200:
            movie = response.json()
            return _build_movie_dict(movie, fallback_title=f"Movie #{tmdb_id}")
    except Exception:
        pass

    # Local dataset fallback if TMDB API network request failed/timed out
    try:
        from recommender import get_movie_by_id
        local_movie = get_movie_by_id(tmdb_id)
        if local_movie:
            return local_movie
    except Exception:
        pass

    return None

